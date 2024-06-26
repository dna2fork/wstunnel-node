const net = require('net');
const WsStream = require('./WsStream');
const url = require('url');
const log = require('./debug').log;
const ClientConn = require('./httptunnel/ClientConn');
const bindStream = require('./bindStream');
const WebSocket = require('ws').WebSocket;

module.exports = wst_client = class wst_client extends require('events')
  .EventEmitter {
  /*
  emit Events:
  'tunnel' (WsStream|ClientConn) when a tunnel is established
  'connectFailed' (err) when ws connection failed
  'connectHttpFailed' (err) when http tunnel connection failed
  */

  constructor() {
    super();
    this.tcpServer = net.createServer();
  }

  verbose() {
    this.on('tunnel', (sock, ws) => {
      if (ws instanceof WsStream) {
        log('Websocket tunnel established');
      } else {
        log('Http tunnel established');
      }
      return sock.on('close', () => log('Tunnel closed'));
    });
    this.on('connectHttpFailed', (error) =>
      log(`HTTP connect error: ${error.toString()}`)
    );
    return this.on('connectFailed', (error) =>
      log(`WS connect error: ${error.toString()}`)
    );
  }

  setHttpOnly(httpOnly) {
    this.httpOnly = httpOnly;
  }
  // example:  start("localhost", 8081, "wss://ws.domain.com:454", "dst.domain.com:22")
  // meaning: tunnel localhost:8081 to remoteAddr by using websocket connection to wsHost
  // @wsHostUrl:  ws:// denotes standard socket, wss:// denotes ssl socket
  //              may be changed at any time to change websocket server info
  start(localHost, localPort, wsHostUrl, remoteAddr, optionalHeaders, cb) {
    this.wsHostUrl = wsHostUrl;

    this.tcpServer.listen(localPort, localHost, cb);
    this.tcpServer.on('connection', (tcpConn) => {
      const bind = (tcp, s) => {
        bindStream(tcp, s);
        this.emit('tunnel', tcp, s);
      };
      this._connect(
        this.wsHostUrl,
        remoteAddr,
        optionalHeaders,
        (err, stream) => {
          if (err) this.emit('connectFailed', err);
          else bind(tcpConn, stream);
        }
      );
    });
  }

  startStdio(wsHostUrl, remoteAddr, optionalHeaders, cb) {
    this.wsHostUrl = wsHostUrl;
    const bind = (s) => {
      process.stdin.pipe(s);
      s.pipe(process.stdout);
      s.on('close', () => process.exit(0));
      s.on('finish', () => process.exit(0));
    };
    this._connect(
      this.wsHostUrl,
      remoteAddr,
      optionalHeaders,
      (err, stream) => {
        if (err) this.emit('connectFailed', err);
        else bind(stream);
        if (cb) cb(err);
      }
    );
  }

  _connect(wsHostUrl, remoteAddr, optionalHeaders, cb) {
    if (this.httpOnly) {
      return this._httpConnect(wsHostUrl, remoteAddr, optionalHeaders, cb);
    } else {
      return this._wsConnect(
        wsHostUrl,
        remoteAddr,
        optionalHeaders,
        (err, wsStream) => {
          if (!err) {
            cb(err, wsStream);
          } else {
            this.emit('connectFailed', err);
            return this._httpConnect(
              wsHostUrl,
              remoteAddr,
              optionalHeaders,
              cb
            );
          }
        }
      );
    }
  }

  _httpConnect(url, remoteAddr, optionalHeaders, cb) {
    let tunurl = url.replace(/^ws/, 'http');
    if (remoteAddr) {
      tunurl += `?dst=${remoteAddr}`;
    }
    const err = new Error('not implemented yet');
    this.emit('connectHttpFailed', err);
    cb(err);
    /*
    const httpConn = new ClientConn(tunurl);
    return httpConn.connect(optionalHeaders, (err) => {
      if (err) {
        this.emit('connectHttpFailed', err);
        return cb(err);
      } else {
        return cb(null, httpConn);
      }
    });
    */
  }

  _wsConnect(wsHostUrl, remoteAddr, optionalHeaders, cb) {
    wsHostUrl = wsHostUrl.replace(/^http/, 'ws');
    let wsurl;
    if (remoteAddr) {
      wsurl = `${wsHostUrl}/?dst=${remoteAddr}`;
    } else {
      wsurl = `${wsHostUrl}`;
    }
    const wsClient = new WebSocket(wsurl, 'tunnel-protocol');
    /*
    const urlo = url.parse(wsurl);
    if (urlo.auth) {
      optionalHeaders.Authorization = `Basic ${Buffer.from(urlo.auth).toString(
        'base64'
      )}`;
    }
    wsClient.connect(wsurl, 'tunnel-protocol', undefined, optionalHeaders, {});
    */
    wsClient.on('error', (error) => cb(error));
    return wsClient.on('open', () => {
       const wsStream = new WsStream(wsClient);
       return cb(null, wsStream);
    });
  }
};
