/**
 * Modbus server read discrete inputs.
 * @module ModbusServerReadDiscreteInputs
 */
'use strict'

let stampit = require('stampit')

let handler = stampit()
  .init(function () {
    let init = function () {
      this.log.debug('initiating read discrete inputs request handler.')

      if (!this.responseDelay) {
        this.responseDelay = 0
      }

      this.setRequestHandler(2, onRequest)
    }.bind(this)

    let onRequest = function (pdu, cb) {
      setTimeout(function () {
        this.log.debug('handling read discrete inputs request.')

        if (pdu.length !== 5) {
          this.log.debug('wrong pdu length.')

          let buf = Buffer.allocUnsafe(2)

          buf.writeUInt8(0x82, 0)
          buf.writeUInt8(0x02, 1)
          cb(buf)

          return
        }

        let start = pdu.readUInt16BE(1)
        let quantity = pdu.readUInt16BE(3)

        this.emit('readDiscreteInputsRequest', start, quantity)

        let mem = this.getInput()

        if (start > mem.length * 8 || start + quantity > mem.length * 8) {
          this.log.debug('wrong pdu length.')

          let buf = Buffer.allocUnsafe(2)

          buf.writeUInt8(0x82, 0)
          buf.writeUInt8(0x02, 1)
          cb(buf)

          return
        }

        let val = 0
        let thisByteBitCount = 0
        let byteIdx = 2
        let byteCount = Math.ceil(quantity / 8)
        let response = Buffer.allocUnsafe(2 + byteCount)

        response.writeUInt8(0x02, 0)
        response.writeUInt8(byteCount, 1)

        for (let totalBitCount = start; totalBitCount < start + quantity; totalBitCount += 1) {
          let buf = mem.readUInt8(Math.floor(totalBitCount / 8))
          let mask = 1 << (totalBitCount % 8)

          if (buf & mask) {
            val += 1 << (thisByteBitCount % 8)
          }

          thisByteBitCount += 1

          if (thisByteBitCount % 8 === 0 || totalBitCount === (start + quantity) - 1) {
            response.writeUInt8(val, byteIdx)
            val = 0; byteIdx = byteIdx + 1
          }
        }

        cb(response)
      }.bind(this), this.responseDelay)
    }.bind(this)

    init()
  })

module.exports = handler
