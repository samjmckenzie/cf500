export interface CheckResult {
    time: number;
    responseTime: number;

    serverHeader: boolean;
    duidCookie: boolean;                // __cfduid
    loadBalancerCookie: boolean;        // __cflb
    botManagementCookie: boolean;       // __cf_bm
    offlineBrowsingInfoCookie: boolean; // cf_ob_info
    useOfflineBrowsingCookie: boolean;  // cf_use_ob
}

export enum IndicatorValueType {
    Negative,
    Medium,
    True,
}

export interface Indicator {
    name: string;
    value: string;
    valueType: IndicatorValueType;
    description: string;
}
