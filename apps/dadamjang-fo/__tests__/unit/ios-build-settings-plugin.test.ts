const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();

jest.mock("node:fs", () => ({
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
}));

jest.mock("expo/config-plugins", () => ({
  withDangerousMod: (
    config: Record<string, unknown>,
    [, applyMod]: [string, (config: Record<string, unknown>) => unknown],
  ) =>
    applyMod({
      ...config,
      modRequest: { platformProjectRoot: "/tmp/dadamjang-ios" },
    }),
  withPodfile: (config: Record<string, unknown>) => config,
  withXcodeProject: (config: Record<string, unknown>) => config,
}));

const withIosBuildSettings = jest.requireActual(
  "../../plugins/with-ios-build-settings.cjs",
) as (config: Record<string, unknown>) => unknown;

const fixture = [
  "/* Begin PBXShellScriptBuildPhase section */",
  "\t\tABC123 /* Upload Debug Symbols to Sentry */ = {",
  "\t\t\tisa = PBXShellScriptBuildPhase;",
  "\t\t\tbuildActionMask = 2147483647;",
  "\t\t\tshellPath = /bin/sh;",
  "\t\t\tshellScript = \"/bin/sh sentry-xcode-debug-files.sh\";",
  "\t\t};",
  "/* End PBXShellScriptBuildPhase section */",
  "\t\tOTHER_LDFLAGS = (",
  "\t\t\t\t\"$(inherited)\",",
  "\t\t\t\t\"-ObjC\",",
  "\t\t\t\t\"-lc++\",",
  "\t\t\t\t\"-lc++\",",
  "\t\t);",
].join("\n");

describe("iOS build settings runtime plugin", () => {
  it("patches a normal Sentry phase once without removing unrelated flags", () => {
    let project = fixture;
    mockReadFileSync.mockImplementation(() => project);
    mockWriteFileSync.mockImplementation((_, contents: string) => {
      project = contents;
    });

    withIosBuildSettings({});
    withIosBuildSettings({});

    expect(project.match(/alwaysOutOfDate = 1;/gu) ?? []).toHaveLength(1);
    expect(project).not.toContain('"-lc++"');
    expect(project).toContain('"$(inherited)"');
    expect(project).toContain('"-ObjC"');
  });
});
