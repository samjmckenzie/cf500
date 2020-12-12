package main

import (
	"context"
	"fmt"
	"github.com/go-redis/redis/v8"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type checkResult struct {
	Time int64						`json:"time"`
	ResponseTime int64				`json:"responseTime"`

	ServerHeader bool               `json:"serverHeader"`
	// See https://support.cloudflare.com/hc/en-us/articles/200170156-Understanding-the-Cloudflare-Cookies
	DuidCookie bool                 `json:"duidCookie"`                 // __cfduid
	LoadBalancerCookie bool         `json:"loadBalancerCookie"`         // __cflb
	BotManagementCookie bool        `json:"botManagementCookie"`        // __cf_bm
	OfflineBrowsingInfoCookie bool  `json:"offlineBrowsingInfoCookie"`  // cf_ob_info
	UseOfflineBrowsingCookie bool   `json:"useOfflineBrowsingCookie"`   // cf_use_ob
}

func getLastCheck(ctx context.Context, redis *redis.Client, hostname string) (*checkResult, error) {
	res, err := redis.HMGet(
		ctx,
		fmt.Sprintf("previous-check:hostname#%s", hostname),
		"time",
		"response-time",
		"server-header",
		"duid-cookie",
		"load-balancer-cookie",
		"bot-management-cookie",
		"offline-browsing-info-cookie",
		"use-offline-browsing-cookie",
	).Result()
	if err != nil { // redis returns error
		return nil, err
	}
	if res[0] == nil { // hostname has not been checked before so results are empty
		return nil, nil
	}

	t, err := strconv.ParseInt(res[0].(string), 10, 64)
	if err != nil {
		return nil, err
	}
	respt, err := strconv.ParseInt(res[1].(string), 10, 64)
	if err != nil {
		return nil, err
	}

	return &checkResult{
		Time:                      t,
		ResponseTime:			   respt,
		ServerHeader:              res[2].(string) == "1",
		DuidCookie:                res[3].(string) == "1",
		LoadBalancerCookie:        res[4].(string) == "1",
		BotManagementCookie:       res[5].(string) == "1",
		OfflineBrowsingInfoCookie: res[6].(string) == "1",
		UseOfflineBrowsingCookie:  res[7].(string) == "1",
	}, nil
}

func updateLastCheck(ctx context.Context, redis *redis.Client, hostname string, check *checkResult) error {
	_, err := redis.HMSet(
		ctx,
		fmt.Sprintf("previous-check:hostname#%s", hostname),
		"time",
		check.Time,
		"response-time",
		check.ResponseTime,
		"server-header",
		check.ServerHeader,
		"duid-cookie",
		check.DuidCookie,
		"load-balancer-cookie",
		check.LoadBalancerCookie,
		"bot-management-cookie",
		check.BotManagementCookie,
		"offline-browsing-info-cookie",
		check.OfflineBrowsingInfoCookie,
		"use-offline-browsing-cookie",
		check.UseOfflineBrowsingCookie,
	).Result()
	return err
}

func check(res *http.Response) *checkResult {
	indicators := &checkResult{
		Time: time.Now().Unix(),
		ResponseTime: 0,

		ServerHeader:              false,
		DuidCookie:                false,
		LoadBalancerCookie:        false,
		BotManagementCookie:       false,
		OfflineBrowsingInfoCookie: false,
		UseOfflineBrowsingCookie:  false,
	}

	if res.Header.Get("server") == "cloudflare" {
		indicators.ServerHeader = true
	}
	setCookieHeader := res.Header.Get("Set-Cookie")
	if setCookieHeader != "" {
		indicators.DuidCookie = strings.Contains(setCookieHeader, "__cfduid=")
		indicators.LoadBalancerCookie = strings.Contains(setCookieHeader, "__cflb=")
		indicators.BotManagementCookie = strings.Contains(setCookieHeader, "__cf_bm=")
		indicators.OfflineBrowsingInfoCookie = strings.Contains(setCookieHeader, "cf_ob_info=")
		indicators.UseOfflineBrowsingCookie = strings.Contains(setCookieHeader, "cf_use_ob=")
	}

	return indicators
}

func makeRequestAndCheck(url string) (*checkResult, error) {
	req, err := http.NewRequest("GET", url, nil)
	// Couldn't create request - maybe invalid url
	if err != nil {
		return nil, err
	}

	c := &http.Client{
		Timeout: 5 * time.Second,
	}

	start := time.Now()
	res, err := c.Do(req)
	// Error during the request - could be timeout
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	checkRes := check(res)
	checkRes.ResponseTime = time.Since(start).Microseconds()

	return checkRes, nil
}
