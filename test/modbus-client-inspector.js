'use strict'

let stampit = require('stampit')
/**
 * Mockup Testing
 */

module.exports = stampit()
  .init(function () {
    this.queueSpy = function () {
      return this.reqFifo.shift()
    }
  })
