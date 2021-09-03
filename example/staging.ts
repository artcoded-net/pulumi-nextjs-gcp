import { NextCloudRun } from "@artcoded/next-pulumi/NextCloudRun";
import * as pulumi from "@pulumi/pulumi";
import { NextApis } from "@artcoded/next-pulumi/NextApis";
import { NextBuildDockerTrigger } from "@artcoded/next-pulumi/NextBuildDockerTrigger";
import nextPackage from "../package.json";

const config = new pulumi.Config();
const vendureApiEndpoint = config.require<string>("vendureApiEnpoint");

export default () => {
  const enablingServices = new NextApis();
  const nextBuildDockerTrigger = new NextBuildDockerTrigger({
    packageInfo: nextPackage,
    vendureApiEndpoint,
  });

  const config = new pulumi.Config();
  const projectName = pulumi.getProject();
  const nextImageName = nextBuildDockerTrigger.encodedImageName.replace(
    "$_VER",
    nextPackage.version
  );

  const nextApp = new NextCloudRun({
    nextImageName,
  });

  return {
    nextServer: {
      endpoint: nextApp.nextServer.statuses[0].url,
      latestReadyRevision:
        nextApp.nextServer.statuses[0].latestReadyRevisionName,
      dockerImageName: nextImageName,
    },
  };
};
