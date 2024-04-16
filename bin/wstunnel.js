const Help = `
-s, --server     run as server, listen on [localip:]localport
-t, --tunnel     run as tunnel client, specify [localip:]localport:host:port
-c, --anycert    accept any certificates

Run websocket tunnel server or client.
 To run server: wstunnel -s 0.0.0.0:8080
 To run client: wstunnel -t localport:host:port ws[s]://wshost:wsport
 Client via http proxy: wstunnel -t localport:host:port -p http://[user:pass@]host:port ws[s]://wshost:wsport
 Client via socks proxy: wstunnel -t localport:host:port -p socks://[user:pass@]ip:port ws[s]://wshost:wsport

Connecting to localhost:localport is the same as connecting to host:port on wshost

For security, you can "lock" the tunnel destination on server side, for eample:
 wstunnel -s 0.0.0.0:8080 -t host:port
Server will tunnel incomming websocket connection to host:port only, so client can just run
 wstunnel -t localport ws://wshost:port
If client run:
 wstunnel -t localport:otherhost:otherport ws://wshost:port
 * otherhost:otherport is ignored, tunnel destination is still "host:port" as specified on server.

In client mode, you can bind stdio to the tunnel by running:
 wstunnel -t stdio:host:port ws[s]://wshost:wsport
This allows the command to be used as ssh proxy:
 ssh -o ProxyCommand="wstunnel -c -t stdio:%h:%p https://wstserver" user@sshdestination
Above command will ssh to "user@sshdestination" via the wstunnel server at "https://wstserver"

`;

function parseCommandLine() {
  const argv = { _: [] };
  let ok = false;

  for (let i = 2; i < process.argv.length; i++) {
    const one = process.argv[i];
    if (one === '-s' || one === '--server') {
       argv.s = process.argv[i+1];
       i++;
    } else if (one === '-t' || one === '--tunnel') {
       argv.t = process.argv[i+1];
       i++;
    } else if (one === '-c' || one === '--anycert') {
      argv.c = true;
    /* disable http mode
    } else if (one === '--http') {
      argv.http = true;
    */
    } else if (one === '--uuid') {
      argv.uuid = process.argv[i+1];
    } else {
      argv._.push(one);
    }
  }

  if (argv.s || argv.t || argv.uuid) ok = true;

  if (!ok) {
    console.error(Help);
    process.exit(1);
  }
  return argv;
}

module.exports = (Server, Client) => {
  const argv = parseCommandLine();

  if (argv.s) {
    let server;
    if (argv.t) {
      let [host, port] = argv.t.split(':');
      server = new Server(host, port);
    } else {
      server = new Server();
    }
    server.start(argv.s, (err) =>
      err ? null : console.log(`WStunnel Server is listening on ${argv.s}`)
    );
  } else if (argv.t || argv.uuid !== undefined) {
    // client mode
    let machineId = require('crypto').randomUUID();
    if (argv.uuid === true) {
      // --uuid without param
      console.log(machineId);
      return;
    } else if (argv.uuid) {
      machineId = argv.uuid;
    }
    if (argv.c) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    let client = new Client();
    let wsHostUrl = argv._[0];

    /* disable http mode
    if (argv.http) {
      client.setHttpOnly(true);
    }
    */
    client.verbose();

    let localHost = 'localhost',
      localPort;
    let remoteAddr;
    let toks = argv.t.split(':');
    if (toks.length === 4) {
      [localHost, localPort] = toks;
      remoteAddr = `${toks[2]}:${toks[3]}`;
    } else if (toks.length === 3) {
      remoteAddr = `${toks[1]}:${toks[2]}`;
      if (toks[0] === 'stdio') {
        localHost = toks[0];
      } else {
        localPort = toks[0];
      }
    } else if (toks.length === 1) {
      remoteAddr = '';
      localPort = toks[0];
    } else {
      console.log('Invalid tunnel option ' + argv.t);
      console.log(Help);
      process.exit(1);
    }
    localPort = parseInt(localPort);
    if (localHost === 'stdio') {
      client.startStdio(wsHostUrl, remoteAddr, { 'x-wstclient': machineId });
    } else {
      client.start(localHost, localPort, wsHostUrl, remoteAddr, {
        'x-wstclient': machineId,
      });
    }
  } else {
    console.log(Help);
  }
};
