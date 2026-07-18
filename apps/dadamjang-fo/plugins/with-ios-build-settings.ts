import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ConfigPlugin,
  ExportedConfigWithProps,
  withDangerousMod,
  withPodfile,
  withXcodeProject,
} from 'expo/config-plugins';

type IosBuildSettingsPluginOptions = {
  deploymentTarget?: string;
};

type XcodeObject = {
  buildSettings?: {
    OTHER_LDFLAGS?: unknown;
  };
  shellScript?: unknown;
  alwaysOutOfDate?: string;
};

type XcodeObjects = Record<string, XcodeObject | string>;

const DEFAULT_DEPLOYMENT_TARGET = '15.1';
const SENTRY_DEBUG_SYMBOLS_SCRIPT = 'sentry-xcode-debug-files.sh';
const SENTRY_DEBUG_SYMBOLS_PHASE = 'Upload Debug Symbols to Sentry';
const DUPLICATED_LIBCXX_FLAG = '"-lc++"';

const createPodDeploymentTargetPatch = (deploymentTarget: string) =>
  [
    '    installer.pods_project.targets.each do |target|',
    '      target.build_configurations.each do |config|',
    `        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${deploymentTarget}'`,
    '      end',
    '    end',
  ].join('\n');

const removeDuplicatedLibcxxFlag = (value: unknown) =>
  Array.isArray(value) ? value.filter((flag) => flag !== DUPLICATED_LIBCXX_FLAG) : value;

const withPodDeploymentTarget: ConfigPlugin<Required<IosBuildSettingsPluginOptions>> = (
  config,
  { deploymentTarget },
) =>
  withPodfile(config, (config) => {
    const patch = createPodDeploymentTargetPatch(deploymentTarget);

    if (config.modResults.contents.includes(patch)) return config;

    const postInstallRegex = /^(  post_install do \|installer\|\n)/m;

    const nextContents = config.modResults.contents.replace(
      postInstallRegex,
      '$1' + patch + '\n',
    );

    if (nextContents === config.modResults.contents) {
      throw new Error('Failed to patch Podfile post_install hook.');
    }

    config.modResults.contents = nextContents;

    return config;
  });

const withXcodeBuildSettings: ConfigPlugin = (config) =>
  withXcodeProject(config, (config) => {
    const shellScriptBuildPhases = (
      config.modResults.hash.project.objects.PBXShellScriptBuildPhase ?? {}
    ) as XcodeObjects;
    const buildConfigurations = (
      config.modResults.hash.project.objects.XCBuildConfiguration ?? {}
    ) as XcodeObjects;

    for (const buildPhase of Object.values(shellScriptBuildPhases)) {
      if (typeof buildPhase === 'string') continue;
      if (typeof buildPhase.shellScript !== 'string') continue;
      if (!buildPhase.shellScript.includes(SENTRY_DEBUG_SYMBOLS_SCRIPT)) continue;

      buildPhase.alwaysOutOfDate = '1';
    }

    for (const buildConfiguration of Object.values(buildConfigurations)) {
      if (typeof buildConfiguration === 'string') continue;

      const otherLdFlags = buildConfiguration.buildSettings?.OTHER_LDFLAGS;

      if (!Array.isArray(otherLdFlags)) continue;

      buildConfiguration.buildSettings = {
        ...buildConfiguration.buildSettings,
        OTHER_LDFLAGS: removeDuplicatedLibcxxFlag(otherLdFlags),
      };
    }

    return config;
  });

const withXcodeBuildSettingsFallback: ConfigPlugin = (config) =>
  withDangerousMod(config, [
    'ios',
    (config: ExportedConfigWithProps) => {
      const projectPath = join(
        config.modRequest.platformProjectRoot,
        'app.xcodeproj',
        'project.pbxproj',
      );
      const project = readFileSync(projectPath, 'utf8');

      if (!project.includes(SENTRY_DEBUG_SYMBOLS_SCRIPT)) return config;

      const sentryPhaseRegex = new RegExp(
        '([A-Z0-9]+ /\\* ' + SENTRY_DEBUG_SYMBOLS_PHASE + ' \\*/ = \\{\\n' +
        '\\t\\t\\tisa = PBXShellScriptBuildPhase;' +
        ')([\\s\\S]*?\\n\\t\\t\\};)',
      );

      const patchedProject = project
        .replace(sentryPhaseRegex, (match: string, start: string, rest: string) => {
          if (match.includes('alwaysOutOfDate = 1;')) return match;
          return start + '\\t\\t\\talwaysOutOfDate = 1;' + rest;
        })
        .split('\\n\\t\\t\\t\\t' + DUPLICATED_LIBCXX_FLAG + ',').join('');

      writeFileSync(projectPath, patchedProject);

      return config;
    },
  ]);

const withIosBuildSettings: ConfigPlugin<IosBuildSettingsPluginOptions> = (
  config,
  options = {},
) => {
  const deploymentTarget = options.deploymentTarget ?? DEFAULT_DEPLOYMENT_TARGET;

  config = withPodDeploymentTarget(config, { deploymentTarget });
  config = withXcodeBuildSettings(config);

  return withXcodeBuildSettingsFallback(config);
};

export default withIosBuildSettings;
