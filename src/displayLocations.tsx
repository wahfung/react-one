import React from "react";
import { useQuery, gql } from "@apollo/client";

// 定义位置数据的接口
interface Location {
  id: string;
  name: string;
  description: string;
  photo: string | null;
}

// 定义查询响应的接口
interface LocationsData {
  locations: Location[];
}

// 查询位置数据
const GET_LOCATIONS = gql`
  query GetLocations {
    locations {
      id
      name
      description
      photo
    }
  }
`;

export function DisplayLocations(): React.ReactElement {
  const { loading, error, data } = useQuery<LocationsData>(GET_LOCATIONS);

  if (loading) return <p>加载中...</p>;
  if (error) return <p>错误: {error.message}</p>;

  // 确保数据存在
  if (!data || !data.locations) return <p>未找到数据</p>;

  return (
    <div className="locations-container">
      {data.locations.map(({ id, name, description, photo }) => (
        <div key={id} className="location-card">
          <h3 className="location-title">{name}</h3>
          {photo && (
            <img
              width="400"
              height="250"
              alt={`${name}的图片`}
              src={photo}
              className="location-image"
              loading="lazy"
            />
          )}
          <div className="location-info">
            <h4>关于此地点:</h4>
            <p>{description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
