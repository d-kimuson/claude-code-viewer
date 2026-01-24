# Privacy and Network Communication

Claude Code Viewer is designed with privacy in mind:

- **Localhost-Only Communication**: The application runs a web client and API server on localhost, communicating exclusively between your browser and the local server
- **Anthropic API Access**: Claude Code is invoked via the Claude Agent SDK, which handles communication to the Anthropic API. No other external services are contacted
- **No Tracking or Telemetry**: The application does not collect crash reports, usage statistics, or any other telemetry. Tracking for Claude Code itself follows the settings configured in Claude Code's own configuration
- **Network Isolation**: The application functions correctly even if network access is restricted to only the Anthropic API and the localhost port. There are no plans to add external network dependencies in the future

If you have concerns about network access, you can verify that the application only communicates with the Anthropic API and localhost by monitoring network traffic.
