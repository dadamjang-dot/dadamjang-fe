import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
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
    /^\s*group:\s*mobile-e2e\s*$/mu.test(workflow),
    `${path}: mobile E2E runs must share one concurrency group`,
  );
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

const workspace = await read("pnpm-workspace.yaml");
check(
  /^minimumReleaseAge:\s*1440$/m.test(workspace),
  "pnpm-workspace.yaml: minimumReleaseAge must be 1440",
);

const rootPackage = JSON.parse(await read("package.json"));
const boPackage = JSON.parse(await read("apps/dadamjang-bo/package.json"));
const partnerPackage = JSON.parse(
  await read("apps/dadamjang-partner/package.json"),
);
check(
  rootPackage.scripts?.["format:check"] !== undefined,
  "package.json: root format:check is missing",
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
