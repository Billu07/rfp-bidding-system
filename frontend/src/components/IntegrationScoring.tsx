// src/components/IntegrationScoring.tsx
import { CheckCircle, Settings, XCircle } from "lucide-react";

interface IntegrationScores {
  zendesk: string;
  oracleSql: string;
  quickbooks: string;
  slack: string;
  brex: string;
  avinode: string;
}

interface IntegrationScoringProps {
  scores: IntegrationScores;
  onChange: (integration: string, score: string) => void;
}

export default function IntegrationScoring({
  scores,
  onChange,
}: IntegrationScoringProps) {
  const integrations = [
    {
      id: "zendesk",
      name: "Zendesk",
      description: "Customer service ticketing and communication platform",
    },
    {
      id: "oracleSql",
      name: "Oracle SQL",
      description: "Database integration and data management",
    },
    {
      id: "quickbooks",
      name: "QuickBooks",
      description: "Financial management and accounting integration",
    },
    {
      id: "slack",
      name: "Slack",
      description: "Internal team communication and notifications",
    },
    {
      id: "brex",
      name: "Brex",
      description: "Payment processing and financial operations",
    },
    {
      id: "avinode",
      name: "Avinode",
      description: "Aircraft sourcing and charter marketplace",
    },
  ];

  const scoreOptions = [
    {
      value: "can-integrate-done",
      label: "Can integrate and have done previously",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      value: "can-integrate-not-done",
      label: "Can integrate but have not done previously",
      icon: Settings,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
    },
    {
      value: "cannot-integrate",
      label: "Cannot integrate",
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
  ];

  const getScoreConfig = (score: string) => {
    return (
      scoreOptions.find((option) => option.value === score) || scoreOptions[2]
    ); // Default to cannot integrate
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-2">
          Integration Capabilities
        </h4>
        <p className="text-sm text-gray-600">
          For each integration below, select your capability level:
        </p>
      </div>

      <div className="space-y-4">
        {integrations.map((integration) => {
          const currentScore =
            scores[integration.id as keyof IntegrationScores];
          const currentConfig = getScoreConfig(currentScore);

          return (
            <div
              key={integration.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900">
                    {integration.name}
                  </h5>
                  <p className="text-sm text-gray-600 mt-1">
                    {integration.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {scoreOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = currentScore === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(integration.id, option.value)}
                        className={`
                          flex items-center px-3 py-2 rounded-lg border text-sm font-medium transition-all
                          ${
                            isSelected
                              ? `${option.bgColor} ${option.borderColor} ${option.color} border-2`
                              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                          }
                        `}
                      >
                        <Icon
                          className={`h-4 w-4 mr-2 ${
                            isSelected ? option.color : "text-gray-400"
                          }`}
                        />
                        <span className="hidden sm:inline">
                          {option.label.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected option display */}
              {currentScore && (
                <div
                  className={`mt-3 p-3 rounded-lg ${currentConfig.bgColor} ${currentConfig.borderColor} border`}
                >
                  <div className="flex items-center">
                    <currentConfig.icon
                      className={`h-4 w-4 mr-2 ${currentConfig.color}`}
                    />
                    <span
                      className={`text-sm font-medium ${currentConfig.color}`}
                    >
                      {currentConfig.label}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h5 className="text-sm font-medium text-gray-900 mb-3">
          Capability Levels:
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {scoreOptions.map((option) => {
            const Icon = option.icon;
            return (
              <div key={option.value} className="flex items-center text-sm">
                <Icon className={`h-4 w-4 mr-2 ${option.color}`} />
                <span className="text-gray-700">{option.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
