'use strict'

/* global describe, it */
let stampit = require('stampit')
let assert = require('assert')

describe('Modbus Serial Client', function () {
  let ModbusSerialClient = require('../src/modbus-serial-client.js')
  let ModbusClientInspector = require('./modbus-client-inspector.js')
  let Logger = require('stampit-log')

  let injectedSerialport = {
    write: function () {},
    connect: function () {},
    isOpen: function () { return true },
    close: function () {},
    on: function () {}
  }

  let ModbusClientBase = stampit().compose(ModbusSerialClient, ModbusClientInspector, Logger)
    .refs({'portName': 'COM1', 'logLevel': 'debug', 'injectedSerialport': injectedSerialport, 'connectionDelay': 0})

  describe('Read Coils Tests.', function () {
    let ReadCoils = require('../src/handler/client/ReadCoils.js')
    let ModbusClient = stampit().compose(ModbusClientBase, ReadCoils)

    it('should read coils just fine.', function (done) {
      let client = ModbusClient()
      client.setState('ready')

      client.readCoils(0, 10).then(function (resp) {
        assert.equal(resp.fc, 1)
        assert.equal(resp.byteCount, 2)
        assert.equal(resp.coils.length, 16)
        assert.deepEqual(resp.payload, Buffer.from([85, 1]))
        assert.deepEqual(resp.coils, [true, false, true, false, true, false, true, false, true, false, false, false, false, false, false, false])

        done()
      }).done()

      client.emit('data', Buffer.from([1, 2, 85, 1]))
    })

    it('Should fail reading coils.', function (done) {
      let client = ModbusClient()
      client.setState('ready')

      client.readCoils(0, 10).catch(function (resp) {
        done()
      }).done()

      client.emit('data', Buffer.from([0x81, 0x01]))
    })
  })

  describe('Read Discrete Inputs Tests.', function () {
    let ReadDiscreteInputs = require('../src/handler/client/ReadDiscreteInputs.js')
    let ModbusClient = stampit().compose(ModbusClientBase, ReadDiscreteInputs)

    it('should read discrete inputs just fine.', function (done) {
      let client = ModbusClient()
      client.setState('ready')

      client.readDiscreteInputs(0, 5).then(function (resp) {
        assert.equal(resp.fc, 2)
        assert.equal(resp.byteCount, 1)
        assert.equal(resp.coils.length, 8)
        assert.deepEqual(resp.payload, Buffer.from([15]))
        assert.deepEqual(resp.coils, [true, true, true, true, false, false, false, false])

        done()
      }).done()

      client.emit('data', Buffer.from([0x02, 0x01, 0x0F]))
    })

    it('should fail reading discrete inputs.', function (done) {
      let client = ModbusClient()
      client.setState('ready')

      client.readDiscreteInputs(0, 5).then(function (resp) {
        assert.ok(false)
      }).catch(function () {
        done()
      }).done()

      client.emit('data', Buffer.from([0x82, 0x02]))
    })
  })

  describe('Read Holding Registers Tests.', function () {
    let ReadHoldingRegisters = require('../src/handler/client/ReadHoldingRegisters.js')
    let ModbusClient = stampit().compose(ModbusClientBase, ReadHoldingRegisters)

    it('should read holding register just fine.', function (done) {
      let client = ModbusClient(true)
      client.setState('ready')

      client.readHoldingRegisters(0, 5).then(function (resp) {
        assert.equal(resp.fc, 3)
        assert.equal(resp.byteCount, 10)
        assert.deepEqual(resp.payload, Buffer.from([0, 1, 0, 2, 0, 3, 0, 4, 0, 5]))
        assert.deepEqual(resp.register, [1, 2, 3, 4, 5])

        done()
      }).done()

      client.emit(
        'data',
        Buffer.from([0x03, 0x0A, 0x00, 0x01, 0x00, 0x02, 0x00, 0x03, 0x00, 0x04, 0x00, 0x05])
      )
    })

    it('should fail reading holding register.', function (done) {
      let client = ModbusClient()
      client.setState('ready')

      client.readHoldingRegisters(0, 5).then(function (resp) {
        assert.ok(false)
      }).catch(function () {
        done()
      }).done()

      client.emit('data', Buffer.from([0x83, 0x03]))
    })
  })

  describe('Read input registers tests.', function () {
    let ReadInputRegisters = require('../src/handler/client/ReadInputRegisters.js')
    let ModbusClient = stampit().compose(ModbusClientBase, ReadInputRegisters)

    it('should read input registers just fine.', function (done) {
      let client = ModbusClient(true)
      client.setState('ready')

      client.readInputRegisters(0, 5).then(function (resp) {
        assert.equal(resp.fc, 4)
        assert.equal(resp.byteCount, 10)
        assert.deepEqual(resp.payload, Buffer.from([0, 5, 0, 4, 0, 3, 0, 2, 0, 1]))
        assert.deepEqual(resp.register, [5, 4, 3, 2, 1])

        done()
      }).done()

      client.emit(
        'data',
        Buffer.from([0x04, 0x0A, 0x00, 0x05, 0x00, 0x04, 0x00, 0x03, 0x00, 0x02, 0x00, 0x01])
      )
    })

    it('should fail reading input register.', function (done) {
      let client = ModbusClient()
      client.setState('ready')

      client.readInputRegisters(0, 5).then(function (resp) {
        assert.ok(false)
      }).catch(function () {
        done()
      }).done()

      client.emit('data', Buffer.from([0x84, 0x03]))
    })
  })

  describe('Write single coil tests.', function () {
    let WriteSingleCoil = require('../src/handler/client/WriteSingleCoil.js')
    let ModbusClient = stampit().compose(ModbusClientBase, WriteSingleCoil)

    it('should write a single coil just fine.', function (done) {
      let client = ModbusClient(true)
      client.setState('ready')

      client.writeSingleCoil(3, true).then(function (resp) {
        assert.equal(resp.fc, 5)
        assert.equal(resp.outputAddress, 3)
        assert.equal(resp.outputValue, true)
        done()
      }).done()

      client.setState('ready')
      client.emit(
        'data',
        Buffer.from([0x05, 0x00, 0x03, 0xFF, 0x00])
      )
    })

    it('should write a single coil with Buffer param true just fine.', function (done) {
      let client = ModbusClient(true)
      client.setState('ready')

      client.writeSingleCoil(3, Buffer.from([1])).then(function (resp) {
        assert.equal(resp.fc, 5)
        assert.equal(resp.outputAddress, 3)
        assert.equal(resp.outputValue, true)

        done()
      }).done()

      client.setState('ready')
      client.emit(
        'data',
        Buffer.from([0x05, 0x00, 0x03, 0xFF, 0x00])
      )
    })

    it('should write a single coil with Buffer param false just fine.', function (done) {
      let client = ModbusClient(true)
      client.setState('ready')

      client.writeSingleCoil(3, Buffer.from([0])).then(function (resp) {
        assert.equal(resp.fc, 5)
        assert.equal(resp.outputAddress, 3)
        assert.equal(resp.outputValue, false)

        done()
      }).done()

      client.setState('ready')
      client.emit(
        'data',
        Buffer.from([0x05, 0x00, 0x03, 0x00, 0x00])
      )
    })

    it('should fail writing single coil.', function (done) {
      let client = ModbusClient()
      client.setState('ready')

      client.writeSingleCoil(4, false).then(function (resp) {
        done(true)
      }).catch(function () {
        done()
      }).done()

      client.emit('data', Buffer.from([0x85, 0x04]))
    })
  })

  describe('Write single register tests.', function () {
    let WriteSingleRegister = require('../src/handler/client/WriteSingleRegister.js')
    let ModbusClient = stampit().compose(ModbusClientBase, WriteSingleRegister)

    it('should write a single register just fine.', function (done) {
      let client = ModbusClient(true)
      client.setState('ready')

      client.writeSingleRegister(3, 123).then(function (resp) {
        assert.equal(resp.fc, 6)
        assert.equal(resp.registerAddress, 3)
        assert.deepEqual(resp.registerAddressRaw, Buffer.from([0x00, 0x03]))
        assert.equal(resp.registerValue, 123)
        assert.deepEqual(resp.registerValueRaw, Buffer.from([0x00, 0x7b]))

        done()
      }).done()

      client.emit(
        'data',
        Buffer.from([0x06, 0x00, 0x03, 0x00, 0x7B])
      )
    })

    it('should write a single register with buffer payload just fine.', function (done) {
      let client = ModbusClient(true)
      client.setState('ready')

      client.writeSingleRegister(3, Buffer.from([0x00, 0x7b])).then(function (resp) {
        assert.equal(resp.fc, 6)
        assert.equal(resp.registerAddress, 3)
        assert.equal(resp.registerValue, 123)
        assert.deepEqual(resp.registerAddressRaw, Buffer.from([0x00, 0x03]))
        assert.deepEqual(resp.registerValueRaw, Buffer.from([0x00, 0x7b]))

        done()
      }).done()

      client.emit(
        'data',
        Buffer.from([0x06, 0x00, 0x03, 0x00, 0x7B])
      )
    })

    it('should fail writing single register.', function (done) {
      let client = ModbusClient()
      client.setState('ready')

      client.writeSingleRegister(4, false).then(function (resp) {
        done(true)
      }).catch(function () {
        done()
      }).done()

      client.emit('data', Buffer.from([0x86, 0x01]))
    })
  })

  describe('Write multiple coils tests.', function () {
    let WriteMultipleCoils = require('../src/handler/client/WriteMultipleCoils.js')
    let ModbusClient = stampit().compose(ModbusClientBase, WriteMultipleCoils)

    it('should write multiple coils just fine.', function (done) {
      let client = ModbusClient(true)
      client.setState('ready')

      client.writeMultipleCoils(20, [true, false, true, true, false, false, true, true, true, false])
        .then(function (resp) {
          assert.equal(resp.fc, 15)
          assert.equal(resp.startAddress, 20)
          assert.equal(resp.quantity, 10)

          done()
        }).done()

      client.emit(
        'data',
        Buffer.from([0x0F, 0x00, 0x14, 0x00, 0x0A, 0x02, 0xCD, 0x01])
      )
    })

    it('should write multiple coils with buffer payload just fine.', function (done) {
      let client = ModbusClient(true)
      client.setState('ready')

      client.writeMultipleCoils(20, Buffer.from([0xCD, 0x01]), 10)
        .then(function (resp) {
          assert.equal(resp.fc, 15)
          assert.equal(resp.startAddress, 20)
          assert.equal(resp.quantity, 10)

          done()
        }).done()

      client.emit(
        'data',
        Buffer.from([0x0F, 0x00, 0x14, 0x00, 0x0A, 0x02, 0xCD, 0x01])
      )
    })

    it('should fail writing multiple coils.', function (done) {
      let client = ModbusClient()
      client.setState('ready')

      client.writeMultipleCoils(4, [true, false, true, false]).then(function (resp) {
        done(true)
      }).catch(function () {
        done()
      }).done()

      client.setState('ready')
      client.emit('data', Buffer.from([0x8F, 0x02]))
    })
  })

  describe('Write multiple registers tests.', function () {
    let WriteMultipleRegisters = require('../src/handler/client/WriteMultipleRegisters.js')
    let ModbusClient = stampit().compose(ModbusClientBase, WriteMultipleRegisters)

    it('should write multiple registers just fine.', function (done) {
      let client = ModbusClient(true)
      client.setState('ready')

      client.writeMultipleRegisters(3, [1, 2, 350]).then(function (resp) {
        assert.equal(resp.fc, 16)
        assert.equal(resp.startAddress, 3)
        assert.equal(resp.quantity, 3)

        done()
      }).done()

      client.emit(
        'data',
        Buffer.from([0x10, 0x00, 0x03, 0x00, 0x03, 0x00, 0x01, 0x00, 0x02, 0x01, 0x6F])
      )
    })

    it('should write multiple registers with buffer payload just fine.', function () {
      let client = ModbusClient(true)
      client.setState('ready')

      client.writeMultipleRegisters(3, Buffer.from([0x00, 0xc4]))
    })

    it('should fail writing multiple registers.', function (done) {
      let client = ModbusClient()
      client.setState('ready')

      client.writeMultipleRegisters(1025, [1, 2, 3]).then(function (resp) {
        done(true)
      }).catch(function () {
        done()
      }).done()

      client.emit('data', Buffer.from([0x90, 0x02]))
    })

    it('should have a clean queue after write', function (done) {
      let client = ModbusClient(true)
      client.setState('ready')
      client.writeMultipleRegisters(3, Buffer.from([0x00, 0xc4]))
      assert.equal(client.queueSpy(), undefined)
      done()
    })
  })

  describe('Timeout tests.', function () {
    let ReadHoldingRegisters = require('../src/handler/client/ReadHoldingRegisters.js')
    let ModbusClient = stampit().compose(ModbusClientBase, ReadHoldingRegisters)

    it('should timeout a read holding registers request.', function (done) {
      let client = ModbusClient({'timeout': 100})
      client.setState('ready')

      client.readHoldingRegisters(3, 10).then(function (resp) {
        done()
      }).catch(function (err) {
        assert.equal(err.err, 'timeout')
        done()
      })
    })

    it('should timeout a read holding registers request, but the request comes after the timeout.', function (done) {
      let client = ModbusClient({'timeout': 200})
      client.setState('ready')

      client.readHoldingRegisters(3, 10).then(function (resp) {
        done(true)
      }).catch(function (err) {
        assert.equal(err.err, 'timeout')
      }).done()

      setTimeout(function () {
        client.emit(
          'data',
          Buffer.from([0x03, 0x0A, 0x00, 0x01, 0x00, 0x02, 0x00, 0x03, 0x00, 0x04, 0x00, 0x05])
        )
        done()
      }, 300)
    })
  })
})
