/**
 * Modbus server write single coil.
 * @module ModbusServerWriteCoil
 */
'use strict'

let stampit = require('stampit')

module.exports = stampit()
  .init(function () {
    let init = function () {
      this.log.debug('initiating write single coil request handler.')

      if (!this.responseDelay) {
        this.responseDelay = 0
      }

      this.setRequestHandler(5, onRequest)
    }.bind(this)

    let onRequest = function (pdu, cb) {
      setTimeout(function () {
        this.log.debug('handling write single coil request.')

        if (pdu.length !== 5) {
          let buf = Buffer.allocUnsafe(2)

          buf.writeUInt8(0x85, 0)
          buf.writeUInt8(0x02, 1)
          cb(buf)
          return
        }

        let address = pdu.readUInt16BE(1)
        let value = !(pdu.readUInt16BE(3) === 0x0000)

        if (pdu.readUInt16BE(3) !== 0x0000 && pdu.readUInt16BE(3) !== 0xFF00) {
          let buf = Buffer.allocUnsafe(2)

          buf.writeUInt8(0x85, 0)
          buf.writeUInt8(0x03, 1)
          cb(buf)
          return
        }

        this.emit('preWriteSingleCoilRequest', address, value)

        let mem = this.getCoils()

        if (address > mem.length * 8) {
          let buf = Buffer.allocUnsafe(2)

          buf.writeUInt8(0x85, 0)
          buf.writeUInt8(0x02, 1)
          cb(buf)
          return
        }

        let response = Buffer.allocUnsafe(5)

        response.writeUInt8(5, 0)
        response.writeUInt16BE(address, 1)
        response.writeUInt16BE(value ? 0xFF00 : 0x0000, 3)

        let oldValue = mem.readUInt8(Math.floor(address / 8))
        let newValue

        if (value) {
          newValue = oldValue | Math.pow(2, address % 8)
        } else {
          newValue = oldValue & ~Math.pow(2, address % 8)
        }

        mem.writeUInt8(newValue, Math.floor(address / 8))

        this.emit('postWriteSingleCoilRequest', address, value)

        cb(response)
      }.bind(this), this.responseDelay)
    }.bind(this)

    init()
  })
