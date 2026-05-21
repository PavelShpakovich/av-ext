import { createMarketplaceContentScript } from '../content-script';

export default createMarketplaceContentScript('avby', ['https://av.by/*', 'https://*.av.by/*']);
