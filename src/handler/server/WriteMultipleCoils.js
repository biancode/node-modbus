/**
 * Modbus server write multiple coils.
 * @module ModbusServerWriteMultipleCoils
 */
'use strict'

let stampit = require('stampit')

module.exports = stampit()
  .init(function () {
    let init = function () {
      this.log.debug('initiating write multiple coils request handler.')

      if (!this.responseDelay) {
        this.responseDelay = 0
      }

      this.setRequestHandler(15, onRequest)
    }.bind(this)

    let onRequest = function (pdu, cb) {
      setTimeout(function () {
        this.log.debug('handling write multiple coils request.')

        if (pdu.length < 3) {
          let buf = Buffer.allocUnsafe(2)

          buf.writeUInt8(0x8F, 0)
          buf.writeUInt8(0x02, 1)
          cb(buf)
          return
        }

        let start = pdu.readUInt16BE(1)
        let quantity = pdu.readUInt16BE(3)
        let byteCount = pdu.readUInt8(5)

        this.emit('preWriteMultipleCoilsRequest', start, quantity, byteCount)

        let mem = this.getCoils()

        // error response
        if (start > mem.length * 8 || start + quantity > mem.length * 8) {
          let buf = Buffer.allocUnsafe(2)

          buf.writeUInt8(0x8F, 0)
          buf.writeUInt8(0x02, 1)
          cb(buf)
          return
        }

        let response = Buffer.allocUnsafe(5)

        response.writeUInt8(0x0F, 0)
        response.writeUInt16BE(start, 1)
        response.writeUInt16BE(quantity, 3)

        let oldValue
        let newValue
        let current = pdu.readUInt8(6 + 0)
        let j = 0

        for (let i = start; i < start + quantity; i += 1) {
          // reading old value from the coils register
          oldValue = mem.readUInt8(Math.floor(i / 8))

          // apply new value
          if (Math.pow(2, j % 8) & current) {
            newValue = oldValue | Math.pow(2, i % 8)
          } else {
            newValue = oldValue & ~Math.pow(2, i % 8)
          }

          // write to buffer
          mem.writeUInt8(newValue, Math.floor(i / 8))

          // read new value from request pdu
          j += 1

          if (j % 8 === 0 && j < quantity) {
            current = pdu.readUInt8(6 + Math.floor(j / 8))
          }
        }

        this.emit('postWriteMultipleCoilsRequest', start, quantity, byteCount)

        cb(response)
      }.bind(this), this.responseDelay)
    }.bind(this)

    init()
  })
