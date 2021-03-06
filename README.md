# JDBCode

This extension provides database description and statement execution services for any SQL database with a TSDBC driver. TSDBC is a TypeScript library
that can load drivers for different database vendors

## Features

- Database schema tree view for explorer
- Connect to any TSDBC datasource
- Execute SQL statements
- _Provide table and column completions_

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: enable/disable this extension
* `myExtension.thing`: set to `blah` to do something

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release

### 2.0.0

Converted from JDBC to TSDBC and no longer requires JVM services