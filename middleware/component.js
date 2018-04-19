"use strict";

const { MiddlewareAbstract } = require("./abstract");
const { ComponentRegistry } = require("../lib/component/registry");
const Shell = require("../lib/component/shell");

/**
 * define req.param keys
 */
const [PARAM_COMPONENT] = ['component'];

/**
 * ComponentMiddleware.
 * @extends MiddlewareAbstract
 * @private
 */
class ComponentMiddleware extends MiddlewareAbstract {

  _init(router, options) {
    const opts = Object.assign({
      // option defaults
      register: [],
      mixins: {}
    }, options);
    /**
     * assemble root registry from provided `register` property
     * merge explicitly provided component registry with the hierarchical fs registry.
     */
    let rootRegistry = ComponentRegistry.create(opts.register, opts.cwd);
    
    /**
     * establish component metadata index
     */
    router.get('/', (req, res) => {
      const meta = this.__getShell(rootRegistry)
        .getAllComponentMetadata();
      res.json(meta);
    });
    /**
     * handle root component invocation
     */
    router.post(`/:${PARAM_COMPONENT}`, (req, res) => {
      const componentName = req.params[PARAM_COMPONENT];
      // invoke
      this.__invoke(componentName, rootRegistry, opts, req, res);
    });

  }

  /**
   * get Shell methods
   * @param registry - The registry for the invocation shell
   * @private
   */
  __getShell(registry) {
    return Shell({
      logger: this._logger
    }, registry);
  }

  /**
   * invoke the component shell.
   * @param componentName: string - component name
   * @param registry - registry to which the component belongs
   * @param options - Middleware options reference.
   * @param req - MobileCloudRequest
   * @param res - express.Response
   * @private
   */
  __invoke(componentName, registry, options, req, res) {
    // apply mixins and invoke component
    const mixins = Object.assign({}, options.mixins);
    if (req.oracleMobile) {
      mixins.oracleMobile = req.oracleMobile;
    }
    this.__getShell(registry)
      .invokeComponentByName(componentName, req.body, mixins, this.__invocationCb(res));
  }
  /**
   * convenience handler for CC invocation
   * @param res: express.Response
   * @private
   */
  __invocationCb(res) {
    return (err, data) => {
      if (!err) {
        res.status(200).json(data);
      } else {
        switch (err.name) {
        case 'unknownComponent':
          res.status(404).send(err.message);
          break;
        case 'badRequest':
          res.status(400).json(err.message);
          break;
        default:
          res.status(500).json(err.message);
          break;
        }
      }
    };
  }
}

module.exports = {
  ComponentMiddleware,
};