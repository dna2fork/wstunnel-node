const crypto = require('crypto');
const ServerConn = require('./ServerConn');
module.exports = class ConnRequest {
  constructor(httpRequest, httpResponse, chainedApps) {
    this.httpRequest = httpRequest;
    this.httpResponse = httpResponse;
    this.chainedApps = chainedApps;
  }

  accept() {
    const sessid = crypto.randomUUID();
    this.httpResponse.writeHead(200, {
      'x-htunsess': sessid,
    });
    this.httpResponse.end();
    return new ServerConn(sessid, this.chainedApps, this.httpRequest);
  }

  reject(httpSatusCode, msg) {
    this.httpResponse.writeHead(httpSatusCode, {
      'x-htunrejectmsg': msg,
    });
    return this.httpResponse.end();
  }
};
