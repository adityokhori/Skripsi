import React from 'react';

const Breadcrumb = ({ activeMenu, setActiveMenu }) => {
  const allSteps = [
    { name: 'Collection', menu: 'Data Collection YouTube' },
    { name: 'Pre Process', menu: 'Pre Processing Data' },
    { name: 'Labelling', menu: 'Labelling Data' },
    { name: 'TF-IDF', menu: 'TF-IDF Vectorization' },
    { name: 'Training', menu: 'Training' },
    { name: 'Testing', menu: 'Uji Test' }
  ];

  const getPageTitle = () => {
    const titles = {
      'Data Collection YouTube': 'Data Collection YouTube',
      'Pre Processing Data': 'Pre Processing Data',
      'Labelling Data': 'Labelling Data - Manual Annotation',
      'TF-IDF Vectorization': 'TF-IDF Vectorization - Feature Extraction',
      'Training': 'Naive Bayes - Model Training',
      'Uji Test': 'Uji Test - Model Testing'
    };
    return titles[activeMenu] || 'Data Collection YouTube';
  };

  const currentIndex = allSteps.findIndex(step => step.menu === activeMenu);
  const progressPercentage = ((currentIndex + 1) / allSteps.length) * 100;

  return (
    <div className="bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{getPageTitle()}</h1>
        <nav className="flex items-center space-x-2 text-red-100">
          {allSteps.map((step, index) => (
            <React.Fragment key={step.name}>
              <button
                onClick={() => setActiveMenu(step.menu)}
                className={`text-sm px-2 py-1 rounded transition-colors ${
                  index === currentIndex
                    ? 'text-white font-medium bg-red-700'
                    : index < currentIndex
                    ? 'text-red-200 hover:text-white cursor-pointer'
                    : 'text-red-300 cursor-default'
                }`}
                disabled={index > currentIndex}
              >
                {step.name}
              </button>
              {index < allSteps.length - 1 && (
                <span className="text-red-200">›</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>
      
      <div className="mt-4">
        <div className="w-full bg-red-700 rounded-full h-2">
          <div 
            className="bg-white h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-red-200">
          <span>Step {currentIndex + 1} of {allSteps.length}</span>
          <span>{Math.round(progressPercentage)}% Complete</span>
        </div>
      </div>
    </div>
  );
};

export default Breadcrumb;
