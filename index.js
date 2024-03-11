const hasbin = require("hasbin");
const fs = require('fs');
const path = require('path');


MOCK_RESPONSES_HANDLER_MODULE = '__mock_responses_handler'


/**
 * This class is a Serverless plugin for mocking server responses.
 */
class ServerlessMockPlugin {
    /**
     * Constructor for the ServerlessMockPlugin class.
     * @param {object} serverless - The serverless instance.
     * @param {object} options - The options passed to the plugin.
     * @param {function} log - A logging function.
     */
    constructor(serverless, options, { log }) {
        this.serverless = serverless;
        this.options = options;
        this.log = log;

        this.hooks = {
            'offline:start:init': this.start.bind(this),
            'offline:start:end': this.clearResources.bind(this),
        };
    }

    /**
     * Locates the Python binary to use.
     */
    locatePython() {
        const customPythonBin = this.serverless.service?.custom?.['serverless-offline-mock-responses']?.pythonBin;

        if (customPythonBin) {
            this.log.debug(`Using Python specified in "pythonBin": ${customPythonBin}`);
            this.pythonBin = customPythonBin;
            return;
        }

        const runtime = this.serverless.service.provider.runtime;
        if (runtime && hasbin.sync(runtime)) {
            this.log.debug(`Using Python specified in "runtime": ${runtime}`);
            this.pythonBin = runtime;
            return;
        }

        this.log.debug("Using default Python executable: python");
        this.pythonBin = "python";
    }

    /**
     * Handler that sets up the mock responses.
     */
    start() {
        this.locatePython();
        let wrapperContent = `import os
import json

import responses

def setup_mock_responses():
    def decorator(func):
        def wrapper(*args, **kwargs):
            config = json.load(open("mocks.json", 'r'))
            responses.start()
            for entry in config:
                method = getattr(responses, (entry.get("method") or "GET").upper())
                responses.add(
                    method, 
                    entry["url"], 
                    json=entry.get("response") or {}, 
                    status=entry.get("status") or 200
                )
            try:
                return func(*args, **kwargs)
            finally:
                responses.stop()
        return wrapper
    return decorator
`;
        const fnNames = this.options.function ? [this.options.function] : this.serverless.service.getAllFunctions();
        fnNames.forEach((name) => {
            const fn = this.serverless.service.getFunction(name);
            if (!fn) {
                throw new this.serverless.classes.Error(`Unknown function: ${name}`);
            }

            try {
                const parsedHandler = this.parseHandler(fn.handler);
                wrapperContent += this.generateWrapperContent(parsedHandler, fn);
                fn.handler = `${MOCK_RESPONSES_HANDLER_MODULE}.wrapped_${parsedHandler.module}_${parsedHandler.handler}`;
            } catch (err) {
                throw err;
            }
        });

        fs.writeFileSync(`${MOCK_RESPONSES_HANDLER_MODULE}.py`, wrapperContent);
        this.setupSignalHandler();
        
        this.log.notice('\n');
        this.log.success(`serverless-offline-mock-responses: setup mock responses successfully!\n`);
    }

    /**
     * Generates the Python wrapper content for a given function.
     * @param {object} functionHandler - The parsed handler of the function.
     * @param {object} fn - The function object.
     * @returns {string} - The generated wrapper content.
     */
    generateWrapperContent(functionHandler) {
        const parts = functionHandler.path.split('/');
        const importPath = parts.length > 0 ? `${parts.join('.')}` : '.'

        return `
@setup_mock_responses()
def wrapped_${functionHandler.module}_${functionHandler.handler}(event, context):
    from ${importPath}.${functionHandler.module} import ${functionHandler.handler}
    return ${functionHandler.handler}(event, context)
`;
    }

    /**
     * Sets up a signal handler for SIGINT to clear resources.
     */
    setupSignalHandler() {
        new Promise(resolve => {
            process.on('SIGINT', () => {
                this.clearResources();
                resolve();
            });
        });
    }

    /**
     * Parses a string representing a handler's full path and decomposes it into its constituent parts: path, module, and handler.
     * 
     * The function expects a full handler path in the format of "path/to/module.handlerFunction".
     * It splits this path to extract and return the directory path, the module name, and the handler function name.
     * 
     * If the handler path does not include a directory path (i.e., it's just "module.handlerFunction"), 
     * the path is set to '.' indicating the current directory.
     * 
     * @param {string} fullHandler - The full handler path string to be parsed.
     * @returns {Object} An object containing three properties:
     *                   - path: The directory path of the handler, '.' if there is no directory.
     *                   - module: The name of the module where the handler function is located.
     *                   - handler: The name of the handler function.
     */
    parseHandler(fullHandler) {
        const parts = fullHandler.split('/');
    
        const filenameWithExtension = parts.pop();
        const [module, handler] = filenameWithExtension.split('.');

        const path = parts.join('/') || '.';

        return {
            path,
            module,
            handler,
        };
    }

    /**
     * Clears up resources when the mock server is stopped.
     */
    clearResources() {
        if (fs.existsSync(`${MOCK_RESPONSES_HANDLER_MODULE}.py`)) {
            fs.unlinkSync(`${MOCK_RESPONSES_HANDLER_MODULE}.py`);
        }
    }
}

module.exports = ServerlessMockPlugin;
