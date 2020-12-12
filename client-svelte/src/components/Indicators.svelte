<script lang="ts">
    import type { Indicator, IndicatorValueType } from "../interfaces";

    interface Indicator {
        name: string;
        value: string;
        valueType
        description: string;
    }

    export let indicators: Indicator[];
</script>

<table>
    <tr>
        <th>Indicator</th>
        <th>Value</th>
        <th>Description</th>
    </tr>
    {#each indicators as indicator (indicator.name)}
    <tr>
        <td class="name">{indicator.name}</td>
        <td class="value">{indicator.value}</td>
        <td class="description">{indicator.description}</td>
    </tr>
    {/each}
</table>

<style>
    table {
        font-size: 1.2em;
        width: 80vw;
        border-collapse: collapse;
        border-radius: 0.4em;
        background-color: #414142;
    }
    th {
        color: #8E8E8E;
        letter-spacing: 0.075em;
        text-transform: lowercase;
        font-variant: small-caps;
    }
</style>
