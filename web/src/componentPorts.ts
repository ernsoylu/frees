/** Named reference directions only: acausal terminals such as a/b or p/n
 * must not be presented as fixed inputs and outputs. */
export function groupComponentPorts(ports: readonly string[]) {
  const inlet: string[] = []
  const outlet: string[] = []
  const connection: string[] = []
  for (const port of ports) {
    if (/(^|_)(in|inlet)\d*(_|$)/i.test(port)) inlet.push(port)
    else if (/(^|_)(out|outlet)\d*(_|$)/i.test(port)) outlet.push(port)
    else connection.push(port)
  }
  return { inlet, outlet, connection }
}
