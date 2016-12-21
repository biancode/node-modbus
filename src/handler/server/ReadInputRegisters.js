/**
 * Modbus server read inputs registers.
 * @module ModbusServerReadInputRegisters
 */
'use strict'

let stampit = require('stampit')

module.exports = stampit()
  .init(function () {
    let init = function () {
      this.log.debug('initiating read input registers request handler.')

      if (!this.responseDelay) {
        this.responseDelay = 0
      }

      this.setRequestHandler(4, onRequest)
    }.bind(this)

    let onRequest = function (pdu, cb) {
      setTimeout(function () {
        this.log.debug('handling read input registers request.')

        if (pdu.length !== 5) {
          let buf = Buffer.allocUnsafe(2)

          buf.writeUInt8(0x84, 0)
          buf.writeUInt8(0x02, 1)
          cb(buf)
          return
        }

        let start = pdu.readUInt16BE(1)
        let byteStart = start * 2
        let quantity = pdu.readUInt16BE(3)

        this.emit('readInputRegistersRequest', byteStart, quantity)

        let mem = this.getInput()

        if (byteStart > mem.length || byteStart + (quantity * 2) > mem.length) {
          let buf = Buffer.allocUnsafe(2)

          buf.writeUInt8(0x84, 0)
          buf.writeUInt8(0x02, 1)
          cb(buf)
          return
        }

        let head = Buffer.allocUnsafe(2)

        head.writeUInt8(0x04, 0)
        head.writeUInt8(quantity * 2, 1)

        let response = Buffer.concat([head, mem.slice(byteStart, byteStart + quantity * 2)])

        cb(response)
      }.bind(this), this.responseDelay)
    }.bind(this)

    init()
  })
