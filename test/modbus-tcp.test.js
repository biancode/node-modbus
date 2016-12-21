/* global describe, it */
'use strict'
let assert = require('assert')
let EventEmitter = require('events')

describe('Modbus TCP Tests.', function () {
  describe('Server Tests.', function () {
        /* We are using the read coils request for the chopped data tests. */

    let ClientSocket = require('../src/modbus-tcp-server-client.js')

    it('should handle a chopped data request fine.', function (done) {
      let em = new EventEmitter()
      let requests = [Buffer.from([0x00, 0x01]),  // Transaction Identifier
        Buffer.from([0x00, 0x00]), // Protocol
        Buffer.from([0x00, 0x05]), // Length
        Buffer.from([0x01]), // Unit identifier
        Buffer.from([0x01]), // PDU Function Code
        Buffer.from([0x00, 0x0A]), // Start Address
        Buffer.from([0x00, 0x15])] // Quantitiy

      let exRequest = {
        request: {
          trans_id: 1,
          protocol_ver: 0,
          unit_id: 1
        },
        pdu: Buffer.from([0x01, 0x00, 0x0A, 0x00, 0x15]),
        socket: em }

      let callbackCounter = 0
      let handler = function (req) {
        assert.deepEqual(req, exRequest)
        callbackCounter += 1
        assert.equal(callbackCounter, 1)
        done()
      }

      ClientSocket({
        socket: em,
        socketId: 1,
        onRequest: handler
      })

      requests.forEach(function (b) {
        em.emit('data', b)
      })
    })
  })

  describe('Client Tests.', function () {
    let stampit = require('stampit')
    let StateMachine = require('stampit-state-machine')
    let Logger = require('stampit-log')

    it('should handle a chopped data request fine.', function (done) {
      let ModbusTcpClient = require('../src/modbus-tcp-client.js')
      let injectedSocket = new EventEmitter()
      let exResponse = Buffer.from([0x01, 0x02, 0x055, 0x01])

      /* dummy method */
      injectedSocket.connect = function () { }

      /* create the client by composing
       * logger, state machine and the tcp client,
       * normally the logger and the state machine
       * come with the modbus client core. */
      let client = stampit()
        .compose(Logger)
        .compose(StateMachine)
        .compose(ModbusTcpClient)({
          injectedSocket: injectedSocket
        })

      /* connect to whatever and confirm */
      client.connect()

      injectedSocket.emit('connect')

      /* fetch send data and compare */
      client.on('data', function (data) {
        assert.equal(data.compare(exResponse), 0)
        done()
      })

      /* Send header data */
      injectedSocket.emit('data', Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x05, 0x01]))
      /* emitting a read coils request (start = 0, count = 10) */
      injectedSocket.emit('data', Buffer.from([0x01, 0x02, 0x55, 0x01]))
    })

    it('should send more than 2^16 msgs just fine', function () {
      this.timeout(5000)

      let ModbusTcpClient = require('../src/modbus-tcp-client.js')
      let injectedSocket = {
        write: function () {},
        connect: function () {},
        on: function () {}
      }

      let client = stampit()
        .compose(StateMachine)
        .compose(Logger)
        .compose(ModbusTcpClient)({
          injectedSocket: injectedSocket
        })

      client.connect()

      for (let i = 0; i < 0x10000; i++) {
        client.emit('send', Buffer.allocUnsafe(5), function () {})
      }
    })
  })
})
