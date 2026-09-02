import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type MaestroCommand = [string, boolean | string];

const readFlow = () =>
  readFileSync(resolve(__dirname, "../../.maestro/ios-full.yaml"), "utf8");
const readWorkflow = () =>
  readFileSync(
    resolve(__dirname, "../../../../.github/workflows/mobile-e2e-full.yml"),
    "utf8",
  );
const parseCommands = (flow: string) => {
  const documents = flow.split(/^---\s*$/mu);
  if (documents.length !== 2) return { commands: [], config: [] };
  const config = documents[0]
    ?.trim()
    .split("\n")
    .map((line) => line.split(/:\s+/u)) as [string, string][];
  const lines = documents[1]?.trim().split("\n") ?? [];
  const commands: MaestroCommand[] = [];

  lines.forEach((line) => {
    const command = /^- ([A-Za-z]+):(?:\s*(.*))?$/u.exec(line);
    if (command?.[1]) {
      commands.push([command[1], command[2] || true]);
      return;
    }
    const value = /^\s{4}(?:id|clearState):\s*(.*)$/u.exec(line)?.[1];
    const lastCommand = commands.at(-1);
    if (value && lastCommand) lastCommand[1] = value === "true" ? true : value;
  });

  return { commands, config };
};

describe("iOS Maestro contract", () => {
  it("uses the email sign-in selector and environment variable", () => {
    const flow = readFlow();

    expect(flow).toContain("id: e2e.auth.email.input");
    expect(flow).toContain("inputText: ${E2E_USER_EMAIL}");
    expect(flow).not.toContain("e2e.auth.userid.input");
    expect(flow).not.toContain("E2E_USER_ID");
  });

  it("receives every flow variable from the full workflow", () => {
    const flowVariables = [...readFlow().matchAll(/\$\{(E2E_[A-Z_]+)\}/gu)].map(
      (match) => match[1],
    );
    const workflowVariables = [
      ...readWorkflow().matchAll(/^\s+(E2E_[A-Z_]+):/gmu),
    ].map((match) => match[1]);

    expect([...new Set(workflowVariables)].sort()).toEqual(
      [...new Set(flowVariables)].sort(),
    );
  });

  it("runs the authenticated commerce actions in order", () => {
    const { commands, config } = parseCommands(readFlow());

    expect(config).toEqual([
      ["appId", "com.dadamjang.fo"],
      ["name", "iOS authenticated commerce journey"],
    ]);
    expect(commands).toEqual([
      ["launchApp", true],
      ["openLink", "dadamjang://auth/signin"],
      ["tapOn", "e2e.auth.email.input"],
      ["inputText", "${E2E_USER_EMAIL}"],
      ["tapOn", "e2e.auth.password.input"],
      ["inputText", "${E2E_USER_PASSWORD}"],
      ["tapOn", "e2e.auth.submit"],
      ["openLink", "dadamjang://shop"],
      ["tapOn", "e2e.wish.add.${E2E_PRODUCT_ID}"],
      ["tapOn", "e2e.navigation.wish"],
      ["assertVisible", "e2e.wish.remove.${E2E_PRODUCT_ID}"],
      ["tapOn", "e2e.wish.remove.${E2E_PRODUCT_ID}"],
      ["openLink", "dadamjang://product/${E2E_PRODUCT_ID}"],
      ["tapOn", "e2e.product.sku.${E2E_SKU_ID}"],
      ["tapOn", "e2e.cart.quantity.increment"],
      ["tapOn", "e2e.product.buy"],
      ["tapOn", "e2e.cart.increment.${E2E_SKU_ID}"],
      ["tapOn", "e2e.checkout.submit"],
      ["assertVisible", "e2e.checkout.pending"],
      ["openLink", "dadamjang://orders"],
      ["assertVisible", "e2e.order.history"],
    ]);
  });
});
