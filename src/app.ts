import ReactDOM from 'react-dom/client';

import RootPlaceholder from "./root";

const root = ReactDOM.createRoot(
    document.getElementById('app') as HTMLElement
);
root.render(RootPlaceholder({}));