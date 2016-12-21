'use strict'

/* global describe, it */
let stampit = require('stampit')
let assert = require('assert')

describe('Modbus Server Core Tests.', function () {
  let ModbusCore = require('../src/modbus-server-core.js').refs({ 'logEnabled': true })

  describe('Exception Tests.', function () {
    it('should answer with 0x8x status code due to missing handler.', function (done) {
      let core = ModbusCore()
      let request = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x0A])
      let exResponse = Buffer.from([0x81, 0x01])

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)
        done()
      }

      core.onData(request, resp)
    })
  })

  describe('Read Coils Tests.', function () {
    let ReadCoils = require('../src/handler/server/ReadCoils.js')
    let Core = stampit().compose(ModbusCore, ReadCoils)

    it('should handle a read coils request just fine.', function (done) {
      let core = Core()
      let request = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x05])
      let exResponse = Buffer.from([0x01, 0x01, 0x15])

      core.getCoils().writeUInt8(0x15, 0)

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })

    it('should handle a read coils request with odd start address just fine.', function (done) {
      let core = Core()
      let request = Buffer.from([0x01, 0x00, 0x02, 0x00, 0x05])
      let exResponse = Buffer.from([0x01, 0x01, 0x05])

      core.getCoils().writeUInt8(0x15, 0)

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })

    it('should handle a read coils request with a start address outside the address space.', function (done) {
      let core = Core()
      let request = Buffer.from([0x01, 0x20, 0x01, 0x00, 10])
      let exResponse = Buffer.from([0x81, 0x02])

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })

    it('should handle a read coils request with a quantity value outside the address space.', function (done) {
      let core = Core()
      let request = Buffer.from([0x01, 0x1f, 0xf8, 0x00, 9])
      let exResponse = Buffer.from([0x81, 0x02])

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })
  })

  describe('Read Discrete Inputs Tests.', function () {
    let ReadDiscreteInputs = require('../src/handler/server/ReadDiscreteInputs.js')
    let Core = stampit().compose(ModbusCore, ReadDiscreteInputs)

    it('should handle a read discrete inputs request just fine.', function (done) {
      let core = Core()
      let request = Buffer.from([0x02, 0x00, 0, 0x00, 5])
      let exResponse = Buffer.from([0x02, 1, 0x15])

      core.getInput().writeUInt8(0x15, 0)

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })

    it('should handle a read discrete inputs request with odd start address just fine.', function (done) {
      let core = Core()
      let request = Buffer.from([0x02, 0x00, 2, 0x00, 5])
      let exResponse = Buffer.from([0x02, 1, 0x05])

      core.getInput().writeUInt8(0x15, 0)

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })

    it('should handle a read discrete inputs request with a start address outside the address space.', function (done) {
      let core = Core()
      let request = Buffer.from([0x02, 0x20, 0x01, 0x00, 10])
      let exResponse = Buffer.from([0x82, 0x02])

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })

    it('should handle a read discrete inputs request with a quantity value outside the address space.', function (done) {
      let core = Core()
      let request = Buffer.from([0x02, 0x1F, 0xF8, 0x00, 9])
      let exResponse = Buffer.from([0x82, 0x02])

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })
  })

  describe('Read Holding Registers Tests.', function () {
    let ReadHoldingRegisters = require('../src/handler/server/ReadHoldingRegisters.js')
    let Core = stampit().compose(ModbusCore, ReadHoldingRegisters)

    it('should handle a read holding registers request just fine.', function (done) {
      let core = Core()
      let request = Buffer.from([0x03, 0x00, 0x01, 0x00, 0x04])
      let exResponse = Buffer.from([0x03, 0x08, 0x00, 0x02, 0x00, 0x03, 0x00, 0x04, 0x00, 0x05])

      core.getHolding().writeUInt16BE(0x01, 0)
      core.getHolding().writeUInt16BE(0x02, 2)
      core.getHolding().writeUInt16BE(0x03, 4)
      core.getHolding().writeUInt16BE(0x04, 6)
      core.getHolding().writeUInt16BE(0x05, 8)

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)
        done()
      }

      core.onData(request, resp)
    })

    it('should handle a read holding registers request with a start address outside the address space.', function (done) {
      let core = Core()
      let request = Buffer.from([0x03, 0x04, 0x05, 0x00, 10])
      let exResponse = Buffer.from([0x83, 0x02])

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)
        done()
      }

      core.onData(request, resp)
    })

    it('should handle a read holding registers request with a quantity value outside the address space.', function (done) {
      let core = Core()
      let request = Buffer.from([0x03, 0x04, 0x03, 0x00, 1])
      let exResponse = Buffer.from([0x83, 0x02])

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })
  })

  describe('Read Input Registers Tests.', function () {
    let ReadInputRegisters = require('../src/handler/server/ReadInputRegisters.js')
    let Core = stampit().compose(ModbusCore, ReadInputRegisters)

    it('should handle a read input registers request just fine.', function (done) {
      let core = Core()
      let request = Buffer.from([0x04, 0x00, 0x01, 0x00, 0x04])
      let exResponse = Buffer.from([0x04, 0x08, 0x00, 4, 0x00, 3, 0x00, 2, 0x00, 1])

      core.getInput().writeUInt16BE(0x05, 0)
      core.getInput().writeUInt16BE(0x04, 2)
      core.getInput().writeUInt16BE(0x03, 4)
      core.getInput().writeUInt16BE(0x02, 6)
      core.getInput().writeUInt16BE(0x01, 8)

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })

    it('should handle a read input registers request with a start address outside the address space.', function (done) {
      let core = Core()
      let request = Buffer.from([0x04, 0x04, 0x05, 0x00, 10])
      let exResponse = Buffer.from([0x84, 0x02])

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })

    it('should handle a read input registers request with a quantity value outside the address space.', function (done) {
      let core = Core()
      let request = Buffer.from([0x04, 0x04, 0x03, 0x00, 1])
      let exResponse = Buffer.from([0x84, 0x02])

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })
  })

  describe('Write Single Coil Tests.', function () {
    let WriteSingleCoil = require('../src/handler/server/WriteSingleCoil.js')
    let Core = stampit().compose(ModbusCore, WriteSingleCoil)

    it('should handle a write single coil request just fine.', function (done) {
      let core = Core()
      let request = Buffer.from([0x05, 0x00, 8, 0xff, 0x00])
      let exResponse = Buffer.from([0x05, 0x00, 8, 0xff, 0x00])

      core.getCoils().writeUInt8(0, 1)

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)
        assert.equal(core.getCoils().readUInt8(1), 1)

        done()
      }

      core.onData(request, resp)
    })

    it('should handle a write single coil request with a start address outside the address space.', function (done) {
      let core = Core()
      let request = Buffer.from([0x05, 0x20, 0x01, 0x00, 0xff00])
      let exResponse = Buffer.from([0x85, 0x02])

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })

    it('should handle a write single coil request with a another value than 0x0000 (false) and 0xff00 (true).', function (done) {
      let core = Core()
      let request = Buffer.from([0x05, 0x00, 8, 0xf3, 0x00])
      let exResponse = Buffer.from([0x85, 0x03])

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })
  })

  describe('Write Single Register Tests.', function () {
    let WriteSingleRegister = require('../src/handler/server/WriteSingleRegister.js')
    let Core = stampit().compose(ModbusCore, WriteSingleRegister)

    it('should handle a write single register request just fine.', function (done) {
      let core = Core()
      let request = Buffer.from([0x06, 0x00, 8, 0x01, 0x23])
      let exResponse = Buffer.from([0x06, 0x00, 8, 0x01, 0x23])

      core.getHolding().writeUInt16BE(0x0123, 8)

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)
        assert.equal(core.getHolding().readUInt16BE(8), 0x0123)

        done()
      }

      core.onData(request, resp)
    })

    it('should handle a write single register request with a start address outside the address space.', function (done) {
      let core = Core()
      let request = Buffer.from([0x06, 0x04, 0x05, 0x01, 0x23])
      let exResponse = Buffer.from([0x86, 0x02])

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })
  })

  describe('Write Multiple Coils Tests.', function () {
    let WriteMultipleCoils = require('../src/handler/server/WriteMultipleCoils.js')
    let Core = stampit().compose(ModbusCore, WriteMultipleCoils)

    it('should handle a write multiple coils request just fine.', function (done) {
      let core = Core()
      let request = Buffer.from([0x0F, 0x00, 12, 0x00, 4, 1, 0x0F])
      let exResponse = Buffer.from([0x0F, 0x00, 12, 0x00, 4])

      core.getCoils().writeUInt8(0x0F, 1)

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)
        assert.equal(core.getCoils().readUInt8(1), 0xFF)

        done()
      }

      core.onData(request, resp)
    })

    it('should handle a write multiple coils request with a start address outside the address space.', function (done) {
      let core = Core()
      let request = Buffer.from([0x0F, 0x20, 0x01, 0x00, 0x04, 0x01, 0x0F])
      let exResponse = Buffer.from([0x8F, 0x02])

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })

    it('should handle a write multiple coils request with a start and quantity outside the address space.', function (done) {
      let core = Core()
      let request = Buffer.from([0x0F, 0x1F, 0xFD, 0x00, 4, 1, 0x0F])
      let exResponse = Buffer.from([0x8F, 0x02])

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })
  })

  describe('Write Multiple Registers Tests.', function () {
    let WriteMultipleRegisters = require('../src/handler/server/WriteMultipleRegisters.js')
    let Core = stampit().compose(ModbusCore, WriteMultipleRegisters)

    it('should handle a write multiple registers request just fine.', function (done) {
      let core = Core()
      let request = Buffer.from([0x10, 0x00, 0x05, 0x00, 0x03, 0x06, 0x00, 0x01, 0x00, 0x02, 0x00, 0x03])
      let exResponse = Buffer.from([0x10, 0x00, 0x05, 0x00, 0x03])

      core.getHolding().writeUInt16BE(0x0000, 10)
      core.getHolding().writeUInt16BE(0x0000, 12)
      core.getHolding().writeUInt16BE(0x0000, 14)

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)
        assert.equal(core.getHolding().readUInt16BE(10), 0x0001)
        assert.equal(core.getHolding().readUInt16BE(12), 0x0002)
        assert.equal(core.getHolding().readUInt16BE(14), 0x0003)

        done()
      }

      core.onData(request, resp)
    })

    it('should handle a write multiple registers request with a start address outside the address space.', function (done) {
      let core = Core()
      let request = Buffer.from([0x10, 0x04, 0x05, 0x00, 0x02, 0x04, 0x00, 0x01, 0x00, 0x02])
      let exResponse = Buffer.from([0x90, 0x02])

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })

    it('should handle a write multiple registers request with a start and quantity outside the address space.', function (done) {
      let core = Core()
      let request = Buffer.from([0x10, 0x04, 0x02, 0x00, 0x02, 0x04, 0x00, 0x01, 0x00, 0x02])
      let exResponse = Buffer.from([0x90, 0x02])

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })

    it('should handle a write multiple registers request with a quantity greater 0x007b.', function (done) {
      let core = Core()
      let request = Buffer.from([0x10, 0x00, 0x00, 0x00, 0x7c, 0xf8, 0x00, 0x01, 0x00, 0x02])
      let exResponse = Buffer.from([0x90, 0x03])

      let resp = function (response) {
        assert.equal(response.compare(exResponse), 0)

        done()
      }

      core.onData(request, resp)
    })
  })
})
