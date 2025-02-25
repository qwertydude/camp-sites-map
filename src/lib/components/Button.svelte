<script>
  export let variant = 'default'; // default, primary, secondary, icon, menu, route-start, route-end, icon-blue, icon-red
  export let size = 'md'; // sm, md, lg
  export let disabled = false;
  export let type = 'button';
  export let icon = '';
  export let iconPosition = 'left'; // left, right
  export let fullWidth = false;
  export let title = '';
  export let className = '';
  
  const baseClasses = 'inline-flex items-center justify-center transition-colors duration-200 focus:outline-none';
  
  const variantClasses = {
    default: 'rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-offset-2',
    primary: 'rounded-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white focus:ring-2 focus:ring-offset-2',
    secondary: 'rounded-md bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-white focus:ring-2 focus:ring-offset-2',
    icon: 'rounded-md bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200',
    menu: 'w-full p-3 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200',
    'route-start': 'rounded-md bg-blue-500 hover:bg-blue-600 text-white px-2 py-1',
    'route-end': 'rounded-md bg-blue-500 hover:bg-blue-600 text-white px-2 py-1',
    'icon-blue': 'p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-500 bg-transparent',
    'icon-red': 'p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-500 bg-transparent'
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
    ${!['menu', 'route-start', 'route-end'].includes(variant) ? (variant === 'icon' ? iconSizeClasses[size] : sizeClasses[size]) : ''}
    ${fullWidth ? 'w-full' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `;
</script>

<button
  {type}
  {disabled}
  {title}
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
