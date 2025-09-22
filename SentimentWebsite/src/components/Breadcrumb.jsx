import React from 'react';

const Breadcrumb = ({ activeMenu, setActiveMenu }) => {
  const getBreadcrumbData = () => {
    const allSteps = [
      { name: 'Collection', menu: 'Data Collection YouTube' },
      { name: 'Pre Process', menu: 'Pre Processing Data' },
      { name: 'Labelling', menu: 'Labelling Data' },
      { name: 'TF-IDF', menu: 'TF-IDF Vectorization' },
      { name: 'Balancing', menu: 'Data Balancing' },
      { name: 'Training', menu: 'Naïve Bayes Training' },
      { name: 'Analysis', menu: 'Analisis Sentimen' }
    ];
    
    const currentIndex = allSteps.findIndex(step => step.menu === activeMenu);
    return { allSteps, currentIndex };
  };

  const getPageTitle = () => {
    switch (activeMenu) {
      case 'Data Collection YouTube':
        return 'Data Collection YouTube';
      case 'Pre Processing Data':
        return 'Pre Processing Data';
      case 'Labelling Data':
        return 'Labelling Data - Manual Annotation';
      case 'TF-IDF Vectorization':
        return 'TF-IDF Vectorization - Feature Extraction';
      case 'Data Balancing':
        return 'Data Balancing - Random Undersampling & Tomek Link';
      case 'Naïve Bayes Training':
        return 'Naïve Bayes Training';
      case 'Analisis Sentimen':
        return 'Analisis Sentimen';
      default:
        return 'Data Collection YouTube';
    }
  };

  return (
    <div className="bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{getPageTitle()}</h1>
        <nav className="flex items-center space-x-2 text-red-100">
          {getBreadcrumbData().allSteps.map((step, index) => (
            <React.Fragment key={step.name}>
              <button
                onClick={() => setActiveMenu(step.menu)}
                className={`text-sm px-2 py-1 rounded transition-colors ${
                  index === getBreadcrumbData().currentIndex
                    ? 'text-white font-medium bg-red-700'
                    : index < getBreadcrumbData().currentIndex
                    ? 'text-red-200 hover:text-white cursor-pointer'
                    : 'text-red-300 cursor-default'
                }`}
                disabled={index > getBreadcrumbData().currentIndex}
              >
                {step.name}
              </button>
              {index < getBreadcrumbData().allSteps.length - 1 && (
                <span className="text-red-200">›</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>
      
      {/* Progress Bar */}
      <div className="mt-4">
        <div className="w-full bg-red-700 rounded-full h-2">
          <div 
            className="bg-white h-2 rounded-full transition-all duration-500"
            style={{ 
              width: `${((getBreadcrumbData().currentIndex + 1) / getBreadcrumbData().allSteps.length) * 100}%` 
            }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-red-200">
          <span>Step {getBreadcrumbData().currentIndex + 1} of {getBreadcrumbData().allSteps.length}</span>
          <span>{Math.round(((getBreadcrumbData().currentIndex + 1) / getBreadcrumbData().allSteps.length) * 100)}% Complete</span>
        </div>
      </div>
    </div>
  );
};

export default Breadcrumb;