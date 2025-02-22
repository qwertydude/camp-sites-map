<script>
  export let variant = 'default'; // default, primary, secondary, icon
  export let size = 'md'; // sm, md, lg
  export let disabled = false;
  export let type = 'button';
  export let icon = '';
  export let iconPosition = 'left'; // left, right
  
  const baseClasses = 'inline-flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    default: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200',
    primary: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-white',
    icon: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
  };
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };
  
  const iconSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };
  
  $: classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${variant === 'icon' ? iconSizeClasses[size] : sizeClasses[size]}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `;
</script>

<button
  {type}
  {disabled}
  class={classes}
  on:click
  {...$$restProps}
>
  {#if icon && iconPosition === 'left'}
    <i class={`${icon} ${variant === 'icon' ? '' : 'mr-2'}`}></i>
  {/if}
  
  {#if variant !== 'icon'}
    <slot />
  {/if}
  
  {#if icon && iconPosition === 'right'}
    <i class={`${icon} ${variant === 'icon' ? '' : 'ml-2'}`}></i>
  {/if}
</button>
