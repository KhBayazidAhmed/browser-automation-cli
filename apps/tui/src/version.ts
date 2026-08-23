declare const BFLOW_VERSION: string | undefined;

export const CLI_NAME = "bflow";
export const CLI_VERSION = typeof BFLOW_VERSION === "string" ? BFLOW_VERSION : "development";
