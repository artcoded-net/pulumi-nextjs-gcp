import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

interface GetRevisionTrafficAllocationInputs {
  maintainTrafficToRevision?: string;
}

export const getRevisionTrafficAllocation = ({
  maintainTrafficToRevision,
}: GetRevisionTrafficAllocationInputs) => {
  const trafficAllocation: pulumi.Input<
    pulumi.Input<gcp.types.input.cloudrun.ServiceTraffic>[]
  > = maintainTrafficToRevision
    ? [
        {
          percent: 0,
          latestRevision: true,
        },
        {
          percent: 100,
          revisionName: maintainTrafficToRevision,
        },
      ]
    : [
        {
          percent: 100,
          latestRevision: true,
        },
      ];
  return trafficAllocation;
};
