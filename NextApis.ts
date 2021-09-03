import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

const projectName = pulumi.getProject();

export class NextApis {
  services: gcp.projects.Service[];

  constructor() {
    this.services = [
      new gcp.projects.Service(`${projectName}-enable-cloud-run`, {
        service: "run.googleapis.com",
        disableDependentServices: true,
      }),
      new gcp.projects.Service(`${projectName}-enable-container-registry`, {
        service: "containerregistry.googleapis.com",
        disableDependentServices: true,
      }),
      new gcp.projects.Service(`${projectName}-enable-cloudbuild`, {
        service: "cloudbuild.googleapis.com",
        disableDependentServices: true,
      }),
      new gcp.projects.Service(`${projectName}-enable-compute`, {
        service: "compute.googleapis.com",
        disableDependentServices: true,
      }),
    ];
  }
}
