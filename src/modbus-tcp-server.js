/**
 * Modbus TCP server.
 * @module ModbusTCPServer
 */
'use strict'

let stampit = require('stampit')
let ModbusServerCore = require('./modbus-server-core.js')
let StateMachine = require('stampit-state-machine')
let ClientSocket = require('./modbus-tcp-server-client.js')

module.exports = stampit()
  .compose(ModbusServerCore)
  .compose(StateMachine)
  .refs({
    'logLabel': 'ModbusTCPServer'
  })
  .init(function () {
    let net = require('net')
    let server
    let socketList = []
    let fifo = []
    let clients = []

    /**
     * Initialization of the modbus TCP server.
     */
    let init = function () {
      if (!this.port) {
        this.port = 502
      }

      if (!this.hostname) {
        this.hostname = '0.0.0.0'
      }

      if (this.netInject) {
        net = this.netInject
      }

      server = net.createServer()

      server.on('connection', function (socket) {
        this.log.debug('new connection', socket.address())

        if (this.whiteListIPs && this.whiteListIPs.indexOf(socket.address()) < 0) {
          this.log.debug('client connection REJECTED', socket.address())
          socket.end()
          return false
        }

        clients.push(socket)
        initiateSocket(socket)
      }.bind(this))

      try {
        server.listen(this.port, this.hostname, function (err) {
          if (err) {
            this.log.debug('error while listening', err)
            this.emit('error', err)
          }
        }.bind(this))

        this.log.debug('server is listening on port', this.hostname + ':' + this.port)

        this.on('newState_ready', flush)
        this.setState('ready')
      } catch (err) {
        this.log.error('server is listening error ' + err + ' on port', this.hostname + ':' + this.port)
        this.setState('error')
      }
    }.bind(this)

    /**
     * Flush incoming data.
     */
    let flush = function () {
      if (this.inState('processing')) {
        return
      }

      if (fifo.length === 0) {
        return
      }

      this.setState('processing')

      let current = fifo.shift()

      this.onData(current.pdu, function (response) {
        this.log.debug('sending tcp data')

        let head = Buffer.allocUnsafe(7)

        head.writeUInt16BE(current.request.trans_id, 0)
        head.writeUInt16BE(current.request.protocol_ver, 2)
        head.writeUInt16BE(response.length + 1, 4)
        head.writeUInt8(current.request.unit_id, 6)

        let pkt = Buffer.concat([head, response])

        current.socket.write(pkt)

        this.setState('ready')
      }.bind(this))
    }.bind(this)

    /**
     * Initiate socket on client requests.
     */
    let initiateSocket = function (socket) {
      let socketId = socketList.length

      let requestHandler = function (req) {
        fifo.push(req)
        flush()
      }

      let removeHandler = function () {
        socketList[socketId] = undefined
        /* remove undefined on the end of the array */
        for (let i = socketList.length - 1; i >= 0; i -= 1) {
          let cur = socketList[i]
          if (cur !== undefined) {
            break
          }
          socketList.splice(i, 1)
        }
        this.log.debug('Client connection closed, remaining clients. ', socketList.length)
      }.bind(this)

      let clientSocket = ClientSocket({
        socket: socket,
        socketId: socketId,
        onRequest: requestHandler,
        onEnd: removeHandler
      })

      socketList.push(clientSocket)
    }.bind(this)

    this.close = function (cb) {
      for (let c in clients) {
        clients[c].destroy()
      }

      server.close(function () {
        server.unref()
        if (cb) { cb() }
      })
    }

    init()
  })
