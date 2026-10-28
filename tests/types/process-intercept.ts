import {
  awaitOperation,
  type EchoPluginContext,
  type HostApiResponse,
  type HostTransportResponse,
} from 'echo:plugin-sdk';
export async function install(context: EchoPluginContext) {
  const process = await awaitOperation(
    context.process.launch({
      executable: 'helpers/analyzer',
      args: ['--quiet'],
      env: { LEVEL: 1 },
    }),
  );
  await awaitOperation(context.process.terminate(process.id));
  const lease = await awaitOperation(
    context.server.intercept({
      id: 'catalog',
      match: 'search',
      priority: 10,
      async handle(request) {
        const response = (await awaitOperation(
          request.next({ query: { page: 1 } }),
        )) as HostApiResponse;
        return response;
      },
    }),
  );
  lease.dispose();
  await awaitOperation(
    context.server.intercept({
      id: 'transport',
      stage: 'transport',
      async handle(request) {
        const response = (await awaitOperation(
          request.next({ headers: request.transport.headers as Record<string, string[]> }),
        )) as HostTransportResponse;
        return response;
      },
    }),
  );
  // @ts-expect-error process ids are strings, not arbitrary OS pids
  context.process.terminate(123);
  // @ts-expect-error unknown stages are not silently selected
  context.server.intercept({ id: 'bad', stage: 'wire', handle() {} });
}
