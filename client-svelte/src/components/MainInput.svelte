<script lang="ts">
    export let onUrlChange: (url: string) => void;

    const placeholderURLs = [
        "americanexpress.com",
        "ralphlauren.com",
        "express-scripts.com",
        "tenethealth.com",
        "regeneron.com",
        "zendesk.com",
        "digitalocean.com",
        "garmin.com",
        "shopify.com",
        "discord.com",
    ];
    let placeholder = placeholderURLs[Math.round(Math.random() * (placeholderURLs.length - 1))];
    let width = placeholder.length;

    let url: string;

    let formInput: HTMLFormElement;
    let leftSide: HTMLParagraphElement;
    let inputElement: HTMLInputElement;
    let rightSide: HTMLParagraphElement;

    function onBlur() {
        formInput.dataset.focus = "false";
        if(url !== "") {
            width = url.length;
        }
    }
    function onFocus() {
        formInput.dataset.focus = "true";
    }
    function onInput() {
        if(url.length >= width) {
            width = url.length;
        }
        if(url === "") {
            width = placeholder.length;
        }
        onUrlChange(url);
    }
</script>

<form bind:this={formInput} id="check-form" data-focus="false" on:submit|preventDefault>
    <span bind:this={leftSide}>Check if the site</span> <input id="check-url" style="width: {width}ch" type="text" bind:this={inputElement} bind:value={url} on:input={onInput} placeholder={placeholder} on:blur={onBlur} on:focus={onFocus} /> <span bind:this={rightSide}>uses Cloudflare</span>
</form>

<style>
    span {
        color: #7C7C7C;
        font-size: 1.8em;
    }
    input {
        font-size: 1.8em;
        background: #3C3C3E;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        border-radius: 0.3em;
        position: relative;
        padding: 0.1em 0.2em;
        margin-left: 0.3em;
        margin-right: 0.3em;
        border: none;
        outline: none;
        color: #BDBDBD;
    }
    input::placeholder {
        color: #626262;
    }
</style>
