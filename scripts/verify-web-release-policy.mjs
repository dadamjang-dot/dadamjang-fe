import {
  chmod,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const rootPath = fileURLToPath(root);
const read = (path) => readFile(new URL(path, root), "utf8");
const listSourceFiles = async (directory) => {
  const entries = await readdir(new URL(`${directory}/`, root), {
    withFileTypes: true,
  });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) return listSourceFiles(path);
      return /\.(?:ts|tsx)$/u.test(entry.name) ? [path] : [];
    }),
  );
  return files.flat();
};
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const readJob = (workflow, name) => {
  const marker = `\n  ${name}:\n`;
  const start = workflow.indexOf(marker);
  if (start < 0) return "";
  const bodyStart = start + marker.length;
  const next = workflow.slice(bodyStart).search(/\n  [a-z][a-z0-9-]*:\n/u);
  return workflow.slice(bodyStart, next < 0 ? undefined : bodyStart + next);
};
const readRunStep = (job, name) => {
  const lines = job.split("\n");
  const stepStart = lines.indexOf(`      - name: ${name}`);
  if (stepStart < 0) return "";
  const nextStep = lines.findIndex(
    (line, index) => index > stepStart && line.startsWith("      - "),
  );
  const stepEnd = nextStep < 0 ? lines.length : nextStep;
  const runStart = lines.findIndex(
    (line, index) =>
      index > stepStart && index < stepEnd && line === "        run: |",
  );
  if (runStart < 0) return "";
  return lines
    .slice(runStart + 1, stepEnd)
    .map((line) => line.slice(10))
    .join("\n")
    .trim();
};
const runEasPreflight = (script, remoteApiUrl, remoteExpectedApiUrl) =>
  spawnSync(
    "/bin/bash",
    [
      "-eu",
      "-o",
      "pipefail",
      "-c",
      `eas() {
  test "$#" = 4
  test "$1" = "env:exec"
  test "$2" = "preview"
  test "$4" = "--non-interactive"
  command env \
    EXPO_PUBLIC_API_URL="$REMOTE_API_URL" \
    EXPECTED_E2E_API_URL="$REMOTE_EXPECTED_API_URL" \
    RUNNER_TEMP=/dev/null \
    remote_api_url_file=/dev/null \
    /bin/sh -c "$3"
}
${script}`,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        EXPECTED_E2E_API_URL: "https://trusted.example/graphql",
        REMOTE_API_URL: remoteApiUrl,
        REMOTE_EXPECTED_API_URL: remoteExpectedApiUrl,
      },
    },
  );
const runHandoffValidation = async (script, values) => {
  const directory = await mkdtemp(join(tmpdir(), "dadamjang-handoff-"));
  const outputPath = join(directory, "github-output");
  const result = spawnSync(
    "/bin/bash",
    ["-eu", "-o", "pipefail", "-c", script],
    {
      encoding: "utf8",
      env: { ...process.env, ...values, GITHUB_OUTPUT: outputPath },
    },
  );
  const output = await readFile(outputPath, "utf8").catch(() => "");
  await rm(directory, { force: true, recursive: true });
  return { ...result, output };
};
const runMaestroSmoke = async (args, env = {}) => {
  const directory = await mkdtemp(join(tmpdir(), "dadamjang-maestro-"));
  const capturePath = join(directory, "capture");
  const maestroPath = join(directory, "maestro");
  await writeFile(
    maestroPath,
    '#!/usr/bin/env bash\nprintf "%s\\n" "$PWD" "$@" > "$MAESTRO_CAPTURE"\n',
  );
  await chmod(maestroPath, 0o755);
  const result = spawnSync(
    "/bin/bash",
    [join(rootPath, "scripts/run-fo-maestro-smoke.sh"), ...args],
    {
      cwd: rootPath,
      encoding: "utf8",
      env: {
        ...process.env,
        ...env,
        MAESTRO_CAPTURE: capturePath,
        PATH: `${directory}:${process.env.PATH ?? ""}`,
      },
    },
  );
  const capture = await readFile(capturePath, "utf8").catch(() => "");
  await rm(directory, { force: true, recursive: true });
  return { ...result, capture };
};

const expectedActions = new Map([
  ["actions/checkout", "11d5960a326750d5838078e36cf38b85af677262"],
  ["pnpm/action-setup", "b906affcce14559ad1aafd4ab0e942779e9f58b1"],
  ["actions/setup-node", "49933ea5288caeca8642d1e84afbd3f7d6820020"],
  ["expo/expo-github-action", "c7b66a9c327a43a8fa7c0158e7f30d6040d2481e"],
  ["actions/upload-artifact", "ea165f8d65b6e75b540449e92b4886f43607fa02"],
  [
    "aws-actions/configure-aws-credentials",
    "7474bc4690e29a8392af63c5b98e7449536d5c3a",
  ],
  [
    "ReactiveCircus/android-emulator-runner",
    "a421e43855164a8197daf9d8d40fe71c6996bb0d",
  ],
]);
const workflowPaths = [
  ".github/workflows/frontend-static.yml",
  ".github/workflows/mobile-e2e-smoke.yml",
  ".github/workflows/mobile-e2e-full.yml",
];
const workflows = await Promise.all(
  workflowPaths.map(async (path) => [path, await read(path)]),
);

for (const [path, workflow] of workflows) {
  for (const match of workflow.matchAll(/^\s*-?\s*uses:\s*([^\s]+)\s*$/gm)) {
    const reference = match[1];
    if (!reference || reference.startsWith("./")) continue;
    const separator = reference.lastIndexOf("@");
    const action = reference.slice(0, separator);
    const revision = reference.slice(separator + 1);
    const expected = expectedActions.get(action);
    check(expected !== undefined, `${path}: unexpected action ${action}`);
    check(
      revision === expected,
      `${path}: ${action} must use ${expected ?? "an approved SHA"}`,
    );
    check(/^[a-f0-9]{40}$/.test(revision), `${path}: ${action} is mutable`);
  }
}

const mobileWorkflows = workflows.filter(([path]) => path.includes("mobile"));
for (const [path, workflow] of mobileWorkflows) {
  const prepareJob = readJob(workflow, "prepare-e2e");
  const cleanupJob = readJob(workflow, "cleanup-e2e");
  const handoffValidation = readRunStep(
    prepareJob,
    "Validate E2E infrastructure handoff",
  );
  const handoffVariables = [
    ["E2E_AWS_ROLE_ARN", "MOBILE_ROLE_ARN"],
    ["E2E_AWS_REGION", "MOBILE_AWS_REGION"],
    ["E2E_API_URL", "MOBILE_API_URL"],
    ["AWS_ECS_CLUSTER", "MOBILE_ECS_CLUSTER"],
    ["AWS_ECS_SERVICE", "MOBILE_ECS_SERVICE"],
    ["AWS_ECS_TASK_DEFINITION", "MOBILE_TASK_DEFINITION"],
    ["AWS_PRIVATE_SUBNET_IDS", "MOBILE_PRIVATE_SUBNET_IDS"],
    ["AWS_API_SECURITY_GROUP_ID", "MOBILE_API_SECURITY_GROUP_ID"],
  ];
  const buildJobNames = path.endsWith("mobile-e2e-smoke.yml")
    ? ["ios-smoke", "android-smoke"]
    : ["ios-full"];
  const concurrency =
    workflow.match(/\nconcurrency:\n(?<body>(?: {2}.+\n)+)/u)?.groups?.body ??
    "";

  check(
    !workflow.includes("mobile-dev-inc/action-maestro"),
    `${path}: mutable Maestro action remains`,
  );
  check(
    workflow.includes("eas-version: 23.0.0"),
    `${path}: EAS CLI is not pinned to 23.0.0`,
  );
  check(
    workflow.includes(
      "https://github.com/mobile-dev-inc/Maestro/releases/download/cli-2.9.0/maestro.zip",
    ),
    `${path}: Maestro 2.9.0 archive is not installed`,
  );
  check(
    workflow.includes(
      "855bb2ce1399d82f4f4a73d84a4d945f70b0d43eb86127e027af82809f63f0bd",
    ),
    `${path}: Maestro checksum is not verified`,
  );
  check(
    concurrency.includes("cancel-in-progress: false"),
    `${path}: active E2E API lifecycle runs must not be cancelled`,
  );
  check(
    concurrency.includes("queue: max"),
    `${path}: trusted E2E runs must retain the full concurrency queue`,
  );
  if (path.endsWith("mobile-e2e-smoke.yml")) {
    check(
      concurrency.includes(
        "github.event.pull_request.head.repo.full_name == github.repository",
      ) &&
        concurrency.includes("'mobile-e2e'") &&
        concurrency.includes("format('mobile-e2e-fork-{0}', github.run_id)"),
      `${path}: fork pull requests must use a run-scoped concurrency group`,
    );
  } else {
    check(
      /^  group: mobile-e2e$/mu.test(concurrency),
      `${path}: trusted full E2E runs must share the mobile-e2e group`,
    );
  }
  for (const jobName of buildJobNames) {
    const buildJob = readJob(workflow, jobName);
    const preflightScript = readRunStep(buildJob, "Verify remote EAS API URL");
    const envExec =
      'eas env:exec preview "$remote_api_url_command" --non-interactive';
    const parentComparison =
      'cmp -s "$remote_api_url_file" <(printf "%s" "$EXPECTED_E2E_API_URL")';
    const childCommandIndex = preflightScript.indexOf(
      "printf -v remote_api_url_command",
    );
    const envExecIndex = preflightScript.indexOf(envExec);
    const parentComparisonIndex = preflightScript.indexOf(parentComparison);
    check(
      buildJob.includes("EXPECTED_E2E_API_URL: ${{ vars.E2E_API_URL }}") &&
        preflightScript.includes('remote_api_url_file="$(mktemp)"') &&
        preflightScript.includes(
          "trap 'rm -f \"$remote_api_url_file\"' EXIT",
        ) &&
        preflightScript.includes(
          'printf -v remote_api_url_command \'printf "%%s" "$EXPO_PUBLIC_API_URL" > %q\' "$remote_api_url_file"',
        ) &&
        envExecIndex >= 0 &&
        parentComparisonIndex > envExecIndex &&
        buildJob.indexOf("Verify remote EAS API URL") <
          buildJob.indexOf("eas build"),
      `${path}: ${jobName} must verify the remote EAS API URL before building`,
    );
    check(
      childCommandIndex >= 0 &&
        !preflightScript
          .slice(childCommandIndex, envExecIndex + envExec.length)
          .includes("EXPECTED_E2E_API_URL"),
      `${path}: ${jobName} must keep the trusted API URL out of the EAS child`,
    );
    check(
      !buildJob.includes("EXPO_PUBLIC_API_URL: ${{ vars.E2E_API_URL }}"),
      `${path}: ${jobName} must not imply runner env reaches EAS Build`,
    );
    const trustedRemote = runEasPreflight(
      preflightScript,
      "https://trusted.example/graphql",
      "https://collision.example/graphql",
    );
    check(
      trustedRemote.status === 0,
      `${path}: ${jobName} lets remote EAS variables override the trusted comparison operand`,
    );
    const mismatchedRemote = runEasPreflight(
      preflightScript,
      "https://collision.example/graphql",
      "https://collision.example/graphql",
    );
    check(
      mismatchedRemote.status === 1,
      `${path}: ${jobName} accepts a remote EAS URL collision`,
    );
    const newlineRemote = runEasPreflight(
      preflightScript,
      "https://trusted.example/graphql\n",
      "https://collision.example/graphql",
    );
    check(
      newlineRemote.status === 1,
      `${path}: ${jobName} ignores trailing bytes in the remote EAS URL`,
    );
  }
  for (const [name, job] of [
    ["prepare", prepareJob],
    ["cleanup", cleanupJob],
  ]) {
    check(
      job.includes("environment: mobile-e2e") &&
        job.includes("id-token: write") &&
        job.includes("aws-actions/configure-aws-credentials") &&
        job.includes("vars.E2E_AWS_ROLE_ARN") &&
        job.includes("vars.E2E_AWS_REGION"),
      `${path}: ${name} job does not own the protected AWS OIDC contract`,
    );
  }
  check(
    handoffVariables.every(
      ([workflowVariable, localVariable]) =>
        prepareJob.includes(`vars.${workflowVariable}`) &&
        handoffValidation.includes(workflowVariable) &&
        handoffValidation.includes(localVariable),
    ) &&
      handoffValidation.includes("e2e Terraform outputs are unavailable") &&
      prepareJob.indexOf("Validate E2E infrastructure handoff") <
        prepareJob.indexOf("aws-actions/configure-aws-credentials"),
    `${path}: E2E output handoff must fail clearly before AWS authentication`,
  );
  check(
    prepareJob.includes(
      "handoff-valid: ${{ steps.handoff.outputs.handoff-valid }}",
    ) &&
      handoffValidation.includes(
        'echo "handoff-valid=true" >> "$GITHUB_OUTPUT"',
      ) &&
      cleanupJob.includes("always()") &&
      cleanupJob.includes(
        "needs.prepare-e2e.outputs.handoff-valid == 'true'",
      ) &&
      cleanupJob.indexOf("aws-actions/configure-aws-credentials") >
        cleanupJob.indexOf("needs.prepare-e2e.outputs.handoff-valid == 'true'"),
    `${path}: cleanup must require a successful AWS handoff`,
  );
  const handoffValues = Object.fromEntries(
    handoffVariables.map(([, localVariable]) => [localVariable, "configured"]),
  );
  const successfulHandoff = await runHandoffValidation(
    handoffValidation,
    handoffValues,
  );
  check(
    successfulHandoff.status === 0 &&
      successfulHandoff.output === "handoff-valid=true\n",
    `${path}: valid handoff does not publish handoff-valid`,
  );
  for (const [workflowVariable, localVariable] of handoffVariables) {
    const invalidHandoff = await runHandoffValidation(handoffValidation, {
      ...handoffValues,
      [localVariable]: "",
    });
    check(
      invalidHandoff.status === 1 &&
        invalidHandoff.stderr.includes(workflowVariable),
      `${path}: ${workflowVariable} is not rejected before AWS authentication`,
    );
  }
  check(
    prepareJob.includes("aws ecs update-service") &&
      prepareJob.includes("--desired-count 1"),
    `${path}: E2E API is not scaled up`,
  );
  check(
    prepareJob.includes("aws ecs wait services-stable"),
    `${path}: E2E API health is not awaited`,
  );
  check(
    prepareJob.includes("aws ecs run-task") &&
      prepareJob.includes("aws ecs wait tasks-stopped") &&
      prepareJob.includes("containers[0].exitCode"),
    `${path}: E2E fixture reset is not validated`,
  );
  check(
    /^    if: always\(\)/mu.test(cleanupJob) &&
      cleanupJob.includes("--desired-count 0"),
    `${path}: E2E API cleanup is not guaranteed`,
  );
}

const eas = JSON.parse(await read("apps/dadamjang-fo/eas.json"));
check(
  eas.cli?.version === "23.0.0",
  "eas.json: EAS CLI must be exactly 23.0.0",
);
check(
  eas.build?.e2e?.environment === "preview",
  "eas.json: e2e builds must explicitly use the preview EAS environment",
);

const workspace = await read("pnpm-workspace.yaml");
check(
  /^minimumReleaseAge:\s*1440$/m.test(workspace),
  "pnpm-workspace.yaml: minimumReleaseAge must be 1440",
);

const rootPackage = JSON.parse(await read("package.json"));
const boPackage = JSON.parse(await read("apps/dadamjang-bo/package.json"));
const foPackage = JSON.parse(await read("apps/dadamjang-fo/package.json"));
const maestroSmokeRunner = await read("scripts/run-fo-maestro-smoke.sh");
const graphqlClientPackage = JSON.parse(
  await read("packages/graphql-client/package.json"),
);
const partnerPackage = JSON.parse(
  await read("apps/dadamjang-partner/package.json"),
);
const nativeProductionFiles = (
  await Promise.all(
    ["apps/dadamjang-fo/src", "packages/mobile/src"].map(listSourceFiles),
  )
).flat();
for (const path of nativeProductionFiles) {
  const contents = await read(path);
  check(
    !/import\s*\{[^}]*\bStyleSheet\b[^}]*\}\s*from\s*["']react-native["']/su.test(
      contents,
    ),
    `${path}: React Native StyleSheet import is forbidden`,
  );
}
check(
  rootPackage.scripts?.["format:check"] !== undefined,
  "package.json: root format:check is missing",
);
check(
  rootPackage.scripts?.["fo:e2e:ios"] ===
    "bash scripts/run-fo-maestro-smoke.sh ios" &&
    rootPackage.scripts?.["fo:e2e:android"] ===
      "bash scripts/run-fo-maestro-smoke.sh android",
  "package.json: local Maestro smoke scripts are missing",
);
check(
  maestroSmokeRunner.includes("E2E_PRODUCT_ID") &&
    maestroSmokeRunner.includes(".maestro/${platform}-smoke.yaml") &&
    maestroSmokeRunner.includes("command -v maestro") &&
    maestroSmokeRunner.includes('cd "$script_dir/../apps/dadamjang-fo"'),
  "scripts/run-fo-maestro-smoke.sh: local smoke runner must require Maestro and E2E_PRODUCT_ID",
);
const invalidPlatform = await runMaestroSmoke(["web"]);
const missingProductId = await runMaestroSmoke(["ios"]);
const iosSmoke = await runMaestroSmoke(["ios"], {
  E2E_PRODUCT_ID: "product-1",
});
check(
  invalidPlatform.status === 64 &&
    missingProductId.status === 1 &&
    iosSmoke.status === 0 &&
    iosSmoke.capture ===
      `${join(rootPath, "apps/dadamjang-fo")}\ntest\n.maestro/ios-smoke.yaml\n`,
  "scripts/run-fo-maestro-smoke.sh: invalid platform, missing ID, or app cwd is not enforced",
);
check(
  rootPackage.scripts?.["measure:fo-problems"] === undefined,
  "package.json: dead FO measurement command remains",
);
check(
  graphqlClientPackage.peerDependencies?.graphql !== undefined,
  "GraphQL client: graphql peer contract is missing",
);
check(
  foPackage.dependencies?.graphql !== undefined &&
    foPackage.devDependencies?.graphql === undefined,
  "FO: graphql must be a runtime dependency",
);
check(
  foPackage.dependencies?.["@expo/ui"] === undefined,
  "FO: redundant @expo/ui dependency remains",
);
check(
  foPackage.dependencies?.["expo-symbols"] === undefined,
  "FO: redundant expo-symbols dependency remains",
);
check(
  boPackage.devDependencies?.prettier === undefined,
  "BO: unused prettier remains",
);
check(
  boPackage.devDependencies?.["@testing-library/react"] === undefined,
  "BO: unused @testing-library/react remains",
);
check(
  boPackage.devDependencies?.["@testing-library/user-event"] === undefined,
  "BO: unused @testing-library/user-event remains",
);
check(
  partnerPackage.devDependencies?.["@testing-library/user-event"] === undefined,
  "Partner: unused @testing-library/user-event remains",
);
check(
  partnerPackage.devDependencies?.["@testing-library/react"] !== undefined,
  "Partner: @testing-library/react must remain",
);
check(
  boPackage.devDependencies?.["@axe-core/playwright"] !== undefined,
  "BO: @axe-core/playwright must remain",
);
check(
  partnerPackage.devDependencies?.["@axe-core/playwright"] !== undefined,
  "Partner: @axe-core/playwright must remain",
);
check(
  workflows[0]?.[1].includes("pnpm format:check"),
  "frontend-static.yml: root format gate is missing",
);

if (failures.length > 0) throw new Error(failures.join("\n"));
console.log("Web release policy verified");
