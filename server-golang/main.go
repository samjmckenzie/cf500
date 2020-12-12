package main

import (
    "context"
    "encoding/json"
    "github.com/go-redis/redis/v8"
    "net/http"
    "net/url"
    "time"
)

func handleSingle( ctx context.Context, rdb *redis.Client, w http.ResponseWriter, serverReq *http.Request) {
    w.Header().Set("Access-Control-Allow-Origin", "*")
    checkURL := serverReq.URL.Query().Get("url")
    if checkURL == "" {
       w.WriteHeader(http.StatusBadRequest)
       w.Write([]byte(`{"errorMessage": "No URL query parameter"}`))
       return
    }

    parsedURL, err := url.Parse(checkURL)
    if err != nil {
       w.WriteHeader(http.StatusInternalServerError)
       w.Write([]byte(`{"errorMessage": "Could not parse URL"}`))
       return
    }
    hostname := parsedURL.Hostname()
    enc := json.NewEncoder(w)

    lastCheck, _ := getLastCheck(ctx, rdb, hostname)
    // Ignore the redis error as we will just make the real request if there is a problem
    if lastCheck != nil {
       if time.Now().Unix() - lastCheck.Time < 60 * 60 * 1000 {
           w.WriteHeader(http.StatusAccepted)
           enc.Encode(lastCheck)
           return
       }
    }

    checkRes, err := makeRequestAndCheck(checkURL)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        enc.Encode(map[string]string{
            "errorMessage": err.Error(),
        })
        return
    }

    w.WriteHeader(http.StatusAccepted)
    enc.Encode(checkRes)

    updateLastCheck(ctx, rdb, hostname, checkRes)
}

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "",
        DB:       0,
    })

    http.HandleFunc("/single", func(w http.ResponseWriter, r *http.Request) {
       handleSingle(ctx, rdb, w, r)
    })

    http.ListenAndServe(":8000", nil)
}
