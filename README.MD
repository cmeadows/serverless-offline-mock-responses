# serverless-offline-mock-responses

## Description

`serverless-offline-mock-responses` is a Serverless Framework plugin designed for mocking server responses during local development. This plugin provides an efficient way to simulate backend responses without needing to interact with actual backend services, facilitating offline testing and development.

## Features

- Setup mock responses with `responses` library
- Customizable Python runtime selection.

## Installation

1. Ensure you have Node.js installed.
2. Install the plugin using npm:
```bash
npm install serverless-offline-mock-responses
```

## Configuration
1. Add the plugin to your serverless.yml file:

```yaml
plugins:
  - serverless-offline-mock-responses
  - serverless-offline
```
2. (Optional) Configure the Python runtime in your serverless.yml under the custom field:
```yaml
custom:
  serverless-offline-mock-responses:
    pythonBin: /path/to/python
```
3. Create a mocks.json file in your project root with your desired mock responses.
   Example:

```json
[
  {
    "url": "http://example.com/api",
    "method": "GET",
    "response": {"message": "Mock response"},
    "status": 200
  }
]
```

## Usage
Start your Serverless offline environment as usual, and the plugin will intercept requests based on your `mocks.json` configuration.

The plugin creates a `__mock_responses_handler.py` file in the root of your serverless project while the `serverless-offline` server is running. This file will be removed upon server shutdown. It is also recommended to addt this file to your `.gitignore` to avoid it being checked in.

## Upcoming Changes

- Add customization of mocks location (currently must be `mocks.json`)
- Add support for YAML and JSON
- Add support for defining mocks in serverless.yml
- Add support for function specific mocks, in addition to global mocks
- Add support for passthru requests
- Implement better error handling and logging

## Contributing
Contributions to `serverless-offline-mock-responses` are welcome. Please ensure that your contributions adhere to the coding standards and include tests covering new features or bug fixes.

## License
This project is licensed under the MIT License.

