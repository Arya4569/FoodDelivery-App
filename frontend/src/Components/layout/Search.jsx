import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faXmark } from "@fortawesome/free-solid-svg-icons";

const Search = () => {
  const { keyword: urlKeyword } = useParams();
  const [keyword, setKeyword] = useState(urlKeyword || "");
  const navigate = useNavigate();

  useEffect(() => {
    if (urlKeyword !== undefined) {
      setKeyword(urlKeyword);
    }
  }, [urlKeyword]);

  const searchHandler = (e) => {
    e.preventDefault();
    if (keyword.trim()) {
      navigate(`/v1/restaurants/search/${keyword.trim()}`);
    } else {
      navigate("/");
    }
  };

  const clearSearch = () => {
    setKeyword("");
    navigate("/");
  };

  return (
    <form onSubmit={searchHandler} className="w-100">
      <div className="input-group modern-search-bar shadow-sm">
        <span className="input-group-text bg-white border-0 ps-3">
          <FontAwesomeIcon icon={faSearch} className="text-muted" />
        </span>
        <input
          type="text"
          id="search_field"
          className="form-control border-0 modern-search-input"
          placeholder="Search for restaurants, cuisine or a dish..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        {keyword && (
          <button
            type="button"
            className="btn bg-white border-0 text-muted pe-2"
            onClick={clearSearch}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        )}
        <button id="search_btn" className="btn btn-search-go" type="submit">
          Search
        </button>
      </div>
    </form>
  );
};

export default Search;
