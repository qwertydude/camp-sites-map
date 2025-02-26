<script>
    import { onMount, onDestroy } from 'svelte';
    export let title = "Route Information";
    export let content = "";
    export let isVisible = false;
    export let onClose = () => { isVisible = false; };
    export let position = { top: '50%', left: '50%' };

    // Handle drag functionality
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let dialogElement;

    function handleMouseDown(e) {
        if (e.target.closest('.dialog-header')) {
            isDragging = true;
            const rect = dialogElement.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
        }
    }

    function handleMouseMove(e) {
        if (isDragging) {
            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;
            position = { top: `${y}px`, left: `${x}px` };
        }
    }

    function handleMouseUp() {
        isDragging = false;
    }

    onMount(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    });

    onDestroy(() => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    });
</script>

{#if isVisible}
<div 
    class="floating-dialog" 
    bind:this={dialogElement}
    on:mousedown={handleMouseDown}
    style="top: {position.top}; left: {position.left};"
>
    <div class="dialog-header">
        <h3>{title}</h3>
        <button on:click={onClose} class="close-btn">×</button>
    </div>
    <div class="dialog-content">
        {@html content}
    </div>
</div>
{/if}

<style>
    .floating-dialog {
        position: fixed;
        transform: translate(-50%, -50%);
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        padding: 20px;
        min-width: 300px;
        max-width: 500px;
    }
    
    .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
    }
    
    .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
    }
    
    .close-btn:hover {
        color: #000;
    }
    
    .dialog-content {
        margin-top: 10px;
    }

    /* Dark mode styles */
    :global(.dark-theme) .floating-dialog {
        background-color: rgb(55 65 81); /* bg-gray-600 */
        color: rgb(243 244 246); /* text-gray-100 */
    }

    :global(.dark-theme) .close-btn {
        color: #ccc;
    }

    :global(.dark-theme) .close-btn:hover {
        color: #fff;
    }
</style>
