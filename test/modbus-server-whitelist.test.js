'use strict'

/* global describe, it */
let sinon = require('sinon')
let modbus = require('../src/modbus-tcp-server.js')

/* some helper */
let createSocket = function (ip) {
  return {
    end: function () { },
    address: function () { return { address: ip } },
    on: function () { }
  }
}

let createServer = function () {
  return {
    on: function () { },
    listen: function () { }
  }
}

let createNet = function (server) {
  return {
    createServer: function () { return server }
  }
}

describe('Modbus Server Whitelist IPs Connection test.', function (done) {
  it('should connect normaly.', function (done) {
    let serverAPI = createServer()
    let netAPI = createNet(serverAPI)
    let socketAPI = createSocket('127.0.0.1')
    let socketMock = sinon.mock(socketAPI)
    let serverStub = sinon.stub(serverAPI, 'on')
    let netStub = sinon.stub(netAPI, 'createServer')

    netStub.returns(serverAPI)
    serverStub.yields(socketAPI)

    socketMock.expects('end').never()

    modbus({
      'injNet': netAPI,
      'whiteListIPs': [
        '127.0.0.1'
      ]
    })

    socketMock.verify()

    done()
  })

  it('should disconnect from server.', function (done) {
    let serverAPI = createServer()
    let netAPI = createNet(serverAPI)
    let socketAPI = createSocket('127.0.0.1')
    let socketMock = sinon.mock(socketAPI)
    let serverStub = sinon.stub(serverAPI, 'on')
    let netStub = sinon.stub(netAPI, 'createServer')

    netStub.returns(serverAPI)
    serverStub.yields(socketAPI)

    socketMock.expects('end').once()

    modbus({
      'netInject': netAPI,
      'whiteListIPs': [
        '127.0.0.2'
      ]
    })

    socketMock.verify()

    done()
  })
})
