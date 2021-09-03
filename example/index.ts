import * as pulumi from "@pulumi/pulumi";

export = async () => {
  const stack = pulumi.getStack();
  return await import(`./${stack}`).then((module) => module.default());
};
