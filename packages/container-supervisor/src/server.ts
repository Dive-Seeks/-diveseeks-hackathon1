import Docker from 'dockerode';
import { buildApp } from './app';
import { SUPERVISOR_PORT } from './hermes.constants';
import { HermesContainerManager } from './manager';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const app = buildApp(new HermesContainerManager(docker));

app.listen(SUPERVISOR_PORT, () => {
  console.log(`container-supervisor listening on :${SUPERVISOR_PORT}`);
});
