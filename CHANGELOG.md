# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="4.0.1-beta.0"></a>
## [4.0.1-beta.0](https://github.com/biancode/node-modbus/compare/v4.0.1-alpha.0...v4.0.1-beta.0) (2017-09-26)


### Bug Fixes

* **client-core:** Rejecting promises when cleaning reqFifo. Prevents unresolved promises, memory leaks, and helps the consuming objects maintain flow in case of errors. ([50d29cc](https://github.com/biancode/node-modbus/commit/50d29cc))
* **client-core:** Rejects command promises if client is not in ready state. Prevents unresolved promises, memory leaks, and helps the object consuming the client maintain flow in case of errors. ([4949ac5](https://github.com/biancode/node-modbus/commit/4949ac5))
* **tcp-client:**  Ensures state is ready when connection complete event emites, to allow consuming objects to to start firing commands on connect, without getting rejected from the check that ensures state is 'ready' later on ([05349ba](https://github.com/biancode/node-modbus/commit/05349ba))



<a name="4.0.1-alpha.0"></a>
## 4.0.1-alpha.0 (2017-09-26)
