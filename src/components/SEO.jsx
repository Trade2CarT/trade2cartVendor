import React from 'react';

const SEO = ({ title, description }) => {
    // This component is a placeholder for Helmet or other SEO libraries.
    // In a simple React setup without such libraries, you can manage the title like this:
    React.useEffect(() => {
        if (title) {
            document.title = title;
        }
        if (description) {
            const metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription) {
                metaDescription.setAttribute('content', description);
            }
        }
    }, [title, description]);

    return null; // This component does not render anything to the DOM
};

export default SEO;
