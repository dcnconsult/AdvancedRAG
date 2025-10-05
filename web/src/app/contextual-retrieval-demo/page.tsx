import ContextualRetrievalDemo from '@/components/ContextualRetrievalDemo';

export default function ContextualRetrievalDemoPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Contextual Retrieval RAG Technique
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Experience how contextual retrieval solves the isolated chunk problem by augmenting 
            individual chunks with document-level context for improved semantic understanding and retrieval.
          </p>
        </div>
        
        <ContextualRetrievalDemo />
      </div>
    </div>
  );
}
