<script lang="ts">
    import type { CheckResult } from "../interfaces";

    import MainInput from "./MainInput.svelte";
    import Indicators from "./Indicators.svelte";


    let currentResult: CheckResult;

    async function checkUrl(url: string) {
        const response = await fetch(`http://localhost:8000/single?url=${url}`, {
            mode: "cors",
        });
        if (response.ok) {
            currentResult = await response.json();
            console.log(currentResult)
        }
    }
</script>

<MainInput onUrlChange={checkUrl} />
<Indicators indicators={[]} />
