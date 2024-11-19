import React, { useState } from 'react';
import { PlusCircle, FileSpreadsheet, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Statement } from '../types';

interface Props {
  statements: Statement[];
  onNewStatement: () => void;
  onEditStatement: (id: string) => void;
}

export default function StatementList({ statements, onNewStatement, onEditStatement }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 11;

  const filteredStatements = statements.filter(statement => 
    (statement.company?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (statement.place?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const totalPages = Math.ceil(filteredStatements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStatements = filteredStatements.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Statements</h1>
          <button
            onClick={onNewStatement}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusCircle size={20} />
            New Statement
          </button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search statements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
      
      <div className="grid gap-3 sm:gap-4">
        {currentStatements.map((statement) => (
          <div
            key={statement.id}
            className="bg-gray-800 p-3 sm:p-4 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer active:bg-gray-600"
            onClick={() => onEditStatement(statement.id)}
          >
            <div className="flex justify-between items-start sm:items-center">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-white truncate">
                  {statement.company || 'No Company'}
                </h3>
                <p className="text-sm text-gray-400 truncate">{statement.place || 'No Location'}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {statement.date instanceof Date 
                    ? statement.date.toLocaleDateString() 
                    : new Date(statement.date).toLocaleDateString()}
                </p>
              </div>
              <FileSpreadsheet className="text-gray-400 shrink-0 ml-3" size={24} />
            </div>
          </div>
        ))}
        
        {filteredStatements.length === 0 && (
          <div className="text-center py-8 sm:py-12 text-gray-500">
            {searchTerm ? 'No matching statements found.' : 'No statements yet. Create your first statement!'}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 rounded-lg ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}