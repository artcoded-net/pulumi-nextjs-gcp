import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import { Output } from "@pulumi/pulumi";
import { getRevisionTrafficAllocation } from "./utils";

interface NextCloudRunInputs {
  nextImageName: Output<string> | string;
  maintainTrafficToRevision?: string;
}

// Note: switching location to enable cloud run domain mapping, not available in europe-central2 region
const location = "europe-west1";
// const location = gcp.config.region || "europe-central2";
const projectName = pulumi.getProject();
const gcpProjectName = gcp.config.project;
const env = pulumi.getStack();
const config = new pulumi.Config();
const siteName = config.require<string>("siteName");
const siteDomain = config.require<string>("siteDomain");
const assetsDomain = config.require<string>("assetsHost");
const vendureApiEndpoint = config.get<string>("vendureApiEndpoint");
const strapiApiEndpoint = config.get<string>("strapiApiEndpoint");
export class NextCloudRun {
  nextServer: gcp.cloudrun.Service;

  constructor({
    nextImageName,
    maintainTrafficToRevision,
  }: NextCloudRunInputs) {
    // Get the latest built image

    let assetDomainsArray: (pulumi.Output<string> | string)[] = [];
    if (strapiApiEndpoint) assetDomainsArray.push(strapiApiEndpoint);
    if (assetsDomain) assetDomainsArray.push(assetsDomain);

    let envVariables: pulumi.Input<
      pulumi.Input<gcp.types.input.cloudrun.ServiceTemplateSpecContainerEnv>[]
    > = [
      {
        name: "NEXT_PUBLIC_SITE_NAME",
        value: siteName,
      },
      {
        name: "ASSETS_DOMAINS",
        value: assetDomainsArray.join(","), // TODO: remove google storage domain if/as not needed
      },
    ];
    if (vendureApiEndpoint)
      envVariables.push({
        name: "NEXT_PUBLIC_SHOP_API_ENDPOINT",
        value: vendureApiEndpoint,
      });
    if (strapiApiEndpoint)
      envVariables.push({
        name: "NEXT_PUBLIC_STRAPI_API_ENDPOINT",
        value: strapiApiEndpoint,
      });

    const serviceName = `${projectName}-${env}-frontend`;

    const trafficAllocation = getRevisionTrafficAllocation({
      maintainTrafficToRevision,
    });

    this.nextServer = new gcp.cloudrun.Service(`${projectName}-next-server`, {
      name: serviceName,
      location,
      template: {
        spec: {
          // serviceAccountName: serviceAccount.email,
          containers: [
            {
              commands: ["/bin/sh"],
              args: ["-c", "yarn start"],
              image: nextImageName,
              ports: [{ containerPort: 3000 }],
              resources: {
                limits: {
                  cpu: "2",
                  memory: "2",
                },
                requests: {
                  cpu: "2",
                  memory: "2",
                },
              },
              envs: envVariables,
            },
          ],
          timeoutSeconds: 1000,
        },
      },
      metadata: {
        annotations: {
          "autoscaling.knative.dev/minScale": "1",
          "autoscaling.knative.dev/maxScale": "2",
          "autoscaling.knative.dev/scaleDownDelay": "15m",
          "run.googleapis.com/client-name": "nextjs-site",
        },
        namespace: gcpProjectName,
      },
      traffics: trafficAllocation,
      autogenerateRevisionName: true,
    });

    // Grant access to the next container via HTTPS to all members
    const publicAccessRole = this.nextServer.name.apply(
      (name) =>
        new gcp.cloudrun.IamMember(`${name}-iam-public-access`, {
          service: name,
          location,
          role: "roles/run.invoker",
          member: "allUsers",
        })
    );

    const rootDomainMapping = new gcp.cloudrun.DomainMapping(
      `${projectName}-frontend-domain-mapping`,
      {
        name: env == "prod" ? siteDomain : `${env}.${siteDomain}`,
        location,
        metadata: {
          namespace: gcpProjectName || projectName,
        },
        spec: {
          routeName: this.nextServer.name,
        },
      }
    );
    if (env == "prod") {
      const wwwDomainMapping = new gcp.cloudrun.DomainMapping(
        `${projectName}-frontend-www-domain-mapping`,
        {
          name: `www.${siteDomain}`,
          location,
          metadata: {
            namespace: gcpProjectName || projectName,
          },
          spec: {
            routeName: this.nextServer.name,
          },
        }
      );
    }
  }
}
