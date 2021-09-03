import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

const cloudProjectId = gcp.config.project;
const codebuildDockerImage = "gcr.io/cloud-builders/docker";

interface NextBuildDockerTriggerInputs {
  packageInfo: any;
  vendureApiEndpoint?: string;
}

export class NextBuildDockerTrigger {
  trigger: gcp.cloudbuild.Trigger;
  encodedImageName: string;

  constructor({
    packageInfo,
    vendureApiEndpoint,
  }: NextBuildDockerTriggerInputs) {
    const packageName = packageInfo.name;
    this.encodedImageName = `eu.gcr.io/${cloudProjectId}/next:v$_VER`;
    const nextApiEndpointArgName = "ENDPOINT";
    const endpointBuildArgCommand = vendureApiEndpoint
      ? ["--build-arg", `${nextApiEndpointArgName}=${vendureApiEndpoint}`]
      : [];
    const projectDirNameArgName = "PROJECT_DIR_NAME";

    const buildArgs: pulumi.Input<pulumi.Input<string>[]> | undefined = [
      ...endpointBuildArgCommand,
    ];

    const triggerName = `${cloudProjectId}-docker-trigger`;

    this.trigger = new gcp.cloudbuild.Trigger(triggerName, {
      name: triggerName,
      github: {
        owner: "artcoded-net",
        name: "artcoded-cms", // this is NOT the name of the repo
        push: {
          // prettier-ignore
          tag: `^${packageName}@([0-9.]+)$`,
        },
      },
      build: {
        substitutions: {
          _VER: "${TAG_NAME##@*@}",
        },
        steps: [
          {
            id: "Docker build",
            name: codebuildDockerImage,
            args: [
              "build",
              ...buildArgs,
              "-t",
              this.encodedImageName,
              // "-f",
              // `./docker/Dockerfile`,
              ".",
            ],
          },
          {
            id: "Docker push",
            name: codebuildDockerImage,
            args: ["push", this.encodedImageName],
          },
        ],
        images: [this.encodedImageName],
        // logsBucket: `gs://${cloudProjectId}/logs`,
        queueTtl: "20s",
        timeout: `${30 * 60}s`, // 30 minuti
      },
    });
  }
}
