/**
 * Server component for rendering legal document HTML content
 * Styled to match the site design with proper typography for legal documents
 */

interface LegalContentProps {
  contentHtml: string;
}

export default function LegalContent({ contentHtml }: LegalContentProps) {
  return (
    <article 
      className="legal-content prose prose-lg max-w-none
        prose-headings:text-[#023047] prose-headings:font-bold
        prose-h1:text-2xl prose-h1:md:text-3xl prose-h1:mb-6 prose-h1:mt-0
        prose-h2:text-xl prose-h2:md:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2
        prose-h3:text-lg prose-h3:md:text-xl prose-h3:mt-6 prose-h3:mb-3
        prose-h4:text-base prose-h4:md:text-lg prose-h4:mt-4 prose-h4:mb-2
        prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
        prose-ul:my-4 prose-ul:pl-6
        prose-ol:my-4 prose-ol:pl-6
        prose-li:text-gray-700 prose-li:mb-2
        prose-a:text-[#FB7D00] prose-a:font-medium prose-a:no-underline hover:prose-a:underline
        prose-strong:text-[#023047] prose-strong:font-semibold
        prose-hr:my-8 prose-hr:border-gray-200"
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
}
