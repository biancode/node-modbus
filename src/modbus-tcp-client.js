/**
 * Modbus TCP client.
 * @module ModbusTCPClient
 */
'use strict'

let stampit = require('stampit')
let ModbusCore = require('./modbus-client-core.js')

module.exports = stampit()
  .compose(ModbusCore)
  .refs({
    'logLabel': 'ModbusTCPClient'
  })
  .init(function () {
    let reqId = 0
    let currentRequestId = reqId
    let closedOnPurpose = false
    let reconnect = false
    let trashRequestId
    let buffer = Buffer.alloc(0)
    let socket
    let closed = true

    let init = function () {
      this.setState('init')

      if (!this.unitId) { this.unitId = 0 }
      if (!this.protocolVersion) { this.protocolVersion = 0 }
      if (!this.port) { this.port = 502 }
      if (!this.host) { this.host = 'localhost' }
      if (!this.autoReconnect) { this.autoReconnect = false }
      if (!this.reconnectTimeout) { this.reconnectTimeout = 0 }

      this.on('send', onSend)
      this.on('newState_error', onError)
      this.on('trashCurrentRequest', onTrashCurrentRequest)

      this.on('stateChanged', this.log.debug)
    }.bind(this)

    let connect = function (callback) {
      this.setState('connect')

      if (!socket) {
        /* for testing you are able to inject a mocking object
         * a simple event object should do the trick */
        if (this.injectedSocket) {
          socket = this.injectedSocket
        } else {
          socket = require('net').Socket()
        }
        socket.on('connect', onSocketConnect)
        socket.on('close', onSocketClose)
        socket.on('error', onSocketError)
        socket.on('data', onSocketData)
        socket.on('timeout', onSocketTimeout)
      }

      try {
        socket.connect(this.port, this.host)
        this.log.debug('socket connected')
        if (typeof callback === 'function') {
          callback()
        }
      } catch (err) {
        this.log.error(err + ' on socket connect')
        if (typeof callback === 'function') {
          callback(err)
        }
      }
    }.bind(this)

    let onSocketConnect = function () {
      closed = false
      this.setState('ready')
      this.emit('connect')
    }.bind(this)

    let onSocketClose = function (hadErrors) {
      this.log.debug('Socket closed with error', hadErrors)

      this.setState('closed')
      this.emit('close')

      if (!closedOnPurpose && (this.autoReconnect || reconnect)) {
        setTimeout(function () {
          reconnect = false
          connect()
        }, this.reconnectTimeout || 0)
      }
    }.bind(this)

    let onSocketError = function (err) {
      this.logError('Socket Error', err)

      this.setState('error')
      this.emit('error', err)
    }.bind(this)

    let onSocketTimeout = function () {
      this.logError('Socket Timeout, setting state to error')

      this.setState('error')
      this.emit('error', 'timeout')
    }.bind(this)

    let onSocketData = function (data) {
      this.log.debug('received data')

      buffer = Buffer.concat([buffer, data])

      while (buffer.length > 7) {
        // 1. extract mbap
        let id = buffer.readUInt16BE(0)
        let len = buffer.readUInt16BE(4)

        if (id === trashRequestId) {
          this.log.debug('current mbap contains trashed request id.')

          return
        }

        /* Not all data received yet. */
        if (buffer.length < 7 + len - 1) {
          break
        }
        this.log.debug('MBAP extracted')

        // 2. extract pdu
        let pdu = buffer.slice(7, 7 + len - 1)
        this.log.debug('PDU extracted')

        // emit data event and let the
        // listener handle the pdu
        this.emit('data', pdu)

        buffer = buffer.slice(pdu.length + 7, buffer.length)
      }
    }.bind(this)

    let onError = function () {
      this.log.error('Client in error state.')
      socket.destroy()
    }.bind(this)

    let onSend = function (pdu, setRequestTimeout) {
      this.log.debug('Sending pdu to the socket.')

      reqId = (reqId + 1) % 0xffff

      let head = Buffer.allocUnsafe(7)

      head.writeUInt16BE(reqId, 0)
      head.writeUInt16BE(this.protocolVersion, 2)
      head.writeUInt16BE(pdu.length + 1, 4)
      head.writeUInt8(this.unitId, 6)
      let pkt = Buffer.concat([head, pdu])
      currentRequestId = reqId

      setRequestTimeout()
      socket.write(pkt)
    }.bind(this)

    let onTrashCurrentRequest = function () {
      trashRequestId = currentRequestId
    }

    this.connect = function (callback) {
      this.setState('connect')

      connect(callback)

      return this
    }

    this.reconnect = function () {
      if (!this.inState('closed')) {
        return this
      }

      closedOnPurpose = false
      reconnect = true

      this.log.debug('Reconnecting client.')

      socket.end()

      return this
    }

    this.close = function (callback) {
      if (closed) {
        if (typeof callback === 'function') {
          callback()
        }
        return this
      }

      closed = true
      closedOnPurpose = true
      this.log.debug('Closing client on purpose.')
      socket.end()
      if (typeof callback === 'function') {
        callback()
      }
      return this
    }

    // following is required to test of stream processing
    // and is only during test active
    if (process.env.DEBUG) {
      this.getSocket = function () {
        return socket
      }
      this.setCurrentRequestId = function (id) {
        currentRequestId = id
      }
      this.registerOnSend = function (_onSend) {
        this.removeListener(onSend)
        this.on('send', _onSend.bind(this))
      }
    }

    init()
  })
